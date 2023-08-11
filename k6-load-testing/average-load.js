import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // traffic ramp-up from 1 to 100 users over 5 minutes.
    { duration: '5m', target: 200 }, // stay at 100 users for 10 minutes
    { duration: '2m', target: 100 }, // ramp-down to 0 users
  ],
};

export default () => {
  const urlRes = http.get('http://172.19.255.201/productpage');
};
