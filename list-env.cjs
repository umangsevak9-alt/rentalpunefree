console.log('Available environment variable names:');
Object.keys(process.env).forEach(key => {
  const value = process.env[key];
  console.log(`- ${key}: ${value ? 'DEFINED (' + value.length + ' chars)' : 'UNDEFINED'}`);
});
