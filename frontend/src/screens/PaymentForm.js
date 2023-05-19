import React, { useContext } from 'react';
import axios from 'axios';
import { BamboraContext } from '../BamboraContext';

const PaymentForm = () => {
  const BamboraCheckout = useContext(BamboraContext);

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    // Process the charge using the single-use token and retrieve the TransactionID
    const { token, error } = await BamboraCheckout.generateToken({
      name: event.target.name.value,
      number: event.target.cardNumber.value,
      expiryMonth: event.target.expiryMonth.value,
      expiryYear: event.target.expiryYear.value,
      cvd: event.target.cvd.value,
    });

    if (error) {
      console.log('Error generating token:', error);
      // Handle error accordingly
    } else {
      console.log('Single-use token:', token);

      // Send the token to your backend server to process the charge and obtain the TransactionID
      const response = await axios.post(
        'https://api.na.bambora.com/v1/payments',
        { token }
      );

      if (response.data.error) {
        console.log('Error processing charge:', response.data.error);
        // Handle error accordingly
      } else {
        const transactionId = response.data.order_number;
        console.log('TransactionID:', transactionId);

        // Generate the payment profile using the obtained TransactionID
        const profileResponse = await axios.post(
          'https://api.na.bambora.com/v1/profiles',
          {
            transactionId,
          }
        );

        if (profileResponse.data.error) {
          console.log(
            'Error generating payment profile:',
            profileResponse.data.error
          );
          // Handle error accordingly
        } else {
          const paymentProfile = profileResponse.data.paymentProfile;
          console.log('Payment Profile:', paymentProfile);
          // Use the payment profile for further processing
        }
      }
    }
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <input type="text" name="name" placeholder="Cardholder Name" />
      <input type="text" name="cardNumber" placeholder="Card Number" />
      <input type="text" name="expiryMonth" placeholder="Expiry Month" />
      <input type="text" name="expiryYear" placeholder="Expiry Year" />
      <input type="text" name="cvd" placeholder="CVD" />
      <button type="submit">Pay</button>
    </form>
  );
};

export default PaymentForm;
