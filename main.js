const express = require('express');
const session = require('express-session');
const path = require('path');
const initDB = require('./index');
const routes = require('./routes/route');
const geo = require('node-geocoder');




async function main() {
  const app = express();
  const port = process.env.PORT || 8080;

  console.log("Initializing database...");
  const db = await initDB();
  console.log("Database initialized successfully");

  app.use(express.static(path.join(__dirname, 'public')));

  const geocoder = geo({
    provider: 'openstreetmap',
    headers: { 'user-agent': 'ContactApp <you@example.com>' }
  });

  app.use((req, res, next) => {
  req.geocoder = geocoder;
  next();
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(session({
    secret: 'contact-list-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, httpOnly: true} 
  }));

  app.use((req, res, next) => {
    req.db = db;
    next();
  });

  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'pug');

  app.use('/', routes);


  app.use((req, res) => {
    res.status(404).render('error', { message: 'Page not found' });
  });
  
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', { message: 'Internal Server Error' });
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

main().catch(error => {
  console.error('Application startup error:', error);
});