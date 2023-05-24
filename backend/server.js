import express from 'express';
import path from 'path';
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import seedRouter from './routes/seedRoutes.js';
import productRouter from './routes/productRoutes.js';
import userRouter from './routes/userRoutes.js';
import orderRouter from './routes/orderRoutes.js';
import cors from 'cors';

dotenv.config();
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('connected to db');
  })
  .catch((err) => {
    err.message;
  });

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get('/api/keys/paypal', (req, res) => {
  res.send(process.env.PAYPAL_CLIENT_ID || 'sb');
});

app.post('/api/proxy', async (req, res) => {
  let cuss;
  try {
    const response = await axios.post(
      'https://api.na.bambora.com/scripts/tokenization/tokens',
      {
        number: req.body.number,
        expiry_month: req.body.expiry_month,
        expiry_year: req.body.expiry_year,
        cvd: req.body.cvd,
      }, // Forward the request body to the Bambora API
      {
        headers: {
          'Content-Type': 'application/json',
          // Include any required headers for authentication or other purposes
        },
      }
    );

    const genProfile = await axios.post(
      `https://api.na.bambora.com/v1/profiles`,
      {
        language: 'en',
        comments: 'hello',
        token: {
          name: req.body.cardName,
          code: response.data.token,
        },
        billing: {
          name: req.body.billingName,
          address_line1: req.body.billingAddress,
          city: req.body.billingCity,
          postal_code: req.body.billingPostalCode,
          email_address: req.body.billingEmail,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.BMAPI,
        },
      }
    );
    cuss = genProfile.data.customer_code;
    const makePay = await axios.post(
      `https://api.na.bambora.com/v1/payments`,
      {
        amount: req.body.amount,
        payment_method: 'payment_profile',
        payment_profile: {
          customer_code: `${genProfile.data.customer_code}`,
          card_id: '1',
          complete: 'true',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: process.env.BMPAY,
        },
      }
    );

    res.json(makePay.data);
  } catch (err) {
    console.log(err.response.data.code);
    if (err.response.data.code == 7) {
      // console.log(cuss);
      // Delete the profile using an Axios request
      const deleteProfile = await axios.delete(
        `https://api.na.bambora.com/v1/profiles/${cuss}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: process.env.BMAPI,
          },
        }
      );
      res.json({ error: 'deleting profile' });
    } else if (err.response.data.code == 17) {
      function generateRandom8DigitNumber() {
        const min = 10000000; // Smallest 8-digit number (10,000,000)
        const max = 99999999; // Largest 8-digit number (99,999,999)
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      const randomNumber = generateRandom8DigitNumber();
      const makePay = await axios.post(
        `https://api.na.bambora.com/v1/payments`,
        {
          order_number: `${randomNumber}`,
          amount: req.body.amount,
          payment_method: 'card',
          card: {
            name: req.body.cardName,
            number: req.body.number,
            expiry_month: req.body.expiry_month,
            expiry_year: req.body.expiry_year,
            cvd: req.body.cvd,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: process.env.BMPAY,
          },
        }
      );
      res.json(makePay.data);
    } else {
      res.status(500).json({ error: 'Failed Card' });
    }
  }
});

app.use('/api/seed', seedRouter);
app.use('/api/products', productRouter);
app.use('/api/users', userRouter);
app.use('/api/orders', orderRouter);

// const __dirname = path.resolve();
// app.use(express.static(path.join(__dirname, '/frontend/build')));
// app.get('*', (req, res) =>
//   res.sendFile(path.join(__dirname, '/frontend/build/index.html'))
// );

app.use((err, req, res, next) => {
  res.status(500).send({ message: err.message });
});

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`serve at http://localhost:${port}`);
});
