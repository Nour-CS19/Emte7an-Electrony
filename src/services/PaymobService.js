export const createPaymentIntention = async (amount, billingData) => {
  const secretKey = import.meta.env.VITE_PAYMOB_SECRET_KEY;
  const publicKey = import.meta.env.VITE_PAYMOB_PUBLIC_KEY;
  
  if (!secretKey || !publicKey) throw new Error("إعدادات Paymob (Public Key أو Secret Key) غير مكتملة");

  try {
    // Convert VITE_PAYMOB_INTEGRATION_ID to an array of numbers (handles comma-separated if the user provides multiple IDs)
    const integrationIds = import.meta.env.VITE_PAYMOB_INTEGRATION_ID
      .split(',')
      .map(id => Number(id.trim()));

    const response = await fetch("https://accept.paymob.com/v1/intention/", {
      method: "POST",
      headers: {
        "Authorization": `Token ${secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        amount: amount * 100, // Paymob takes amount in cents/piasters
        currency: "EGP",
        payment_methods: integrationIds,
        billing_data: {
          first_name: billingData.first_name || "NA",
          last_name: billingData.last_name || "NA",
          email: billingData.email || "NA@na.com",
          phone_number: billingData.phone || "01000000000",
          apartment: "NA",
          floor: "NA",
          street: "NA",
          building: "NA",
          city: "NA",
          country: "EG"
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({ detail: "Unknown error" }));
      console.error("Paymob Intention Error:", errData);
      throw new Error(errData.detail || errData.message || JSON.stringify(errData) || "فشل في إنشاء طلب الدفع من Paymob");
    }

    const data = await response.json();
    
    // Paymob unified checkout URL requires publicKey and clientSecret
    if (data.client_secret) {
      return `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${data.client_secret}`;
    } else {
      console.error("No client_secret in Paymob response:", data);
      throw new Error("Paymob API didn't return a client_secret.");
    }
  } catch (error) {
    console.error("Error creating payment:", error);
    throw error;
  }
};
