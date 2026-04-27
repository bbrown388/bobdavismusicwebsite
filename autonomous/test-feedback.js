const { fetchNewFeedback } = require('./feedback');

fetchNewFeedback().then(items => {
  console.log('Feedback items:', JSON.stringify(items, null, 2));
  console.log('Count:', items.length);
  process.exit(0);
}).catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
