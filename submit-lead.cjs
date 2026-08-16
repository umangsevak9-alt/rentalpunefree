const run = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '9999999999',
        property_id: 1,
        notes: 'Testing lead flow directly through backend API.'
      })
    });

    console.log('Status:', response.status);
    const body = await response.json();
    console.log('Response body:', body);
  } catch (err) {
    console.error('Submission failed:', err);
  }
};

run();
