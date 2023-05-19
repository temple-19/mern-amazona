import React, { createContext } from 'react';
import { Checkout, Client } from 'bambora-checkout-sdk';

export const BamboraContext = createContext();

export const BamboraProvider = ({ children }) => {
  // Create the Bambora client instance
  const bamboraClient = Client.withApiKey('<YOUR_API_KEY>');

  // Configure the Bambora Checkout with your merchant ID and the client instance
  Checkout.configure('<YOUR_MERCHANT_ID>', bamboraClient);

  return (
    <BamboraContext.Provider value={Checkout}>
      {children}
    </BamboraContext.Provider>
  );
};
