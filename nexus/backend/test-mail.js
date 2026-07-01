async function testResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not found in environment');
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: 'Nexus System Alert <alerts@klypso.in>',
        to: 'test@example.com',
        subject: 'Test Resend Verification',
        html: '<p>This is a test email</p>'
      })
    });

    if (res.ok) {
      console.log('Email sent successfully via Resend API');
    } else {
      console.log('Failed to send email. Status:', res.status);
      const text = await res.text();
      console.log('Response:', text);
    }
  } catch (e) {
    console.error('Error during fetch:', e.message);
  }
}

testResend();
