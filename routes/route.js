const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');


const requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect('/login?error=Please login to access this page');
  }
  next();
};

router.get('/', async (req, res) => {
  try {
    const contacts = await req.db.getAllContacts();
    res.render('contacts/list', { 
      contacts,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).render('error', { message: 'Failed to load contacts' });
  }

});

router.get('/login', async (req, res) => {
  if (req.session.user) {
    return res.redirect('/');
  }
  res.render('auth/login', { hide_login: true });
});

router.post('/login', async (req, res) => {
  try {
    if (!req.body || !req.body.username || !req.body.password) {
      return res.render('auth/login', { hide_login: true, message: 'Missing username or password.' });
    }

    const username = req.body.username.trim();
    const p1 = req.body.password.trim();
    const user = await req.db.getUserByUsername(username);

    console.log('User from DB:', user);
    console.log('Password entered:', p1);

    if (!user) {
      return res.render('auth/login', { hide_login: true, message: 'User not found.' });
    }

    if (!user.Password) {
      console.error('Password field is missing in DB result.');
      return res.render('auth/login', { hide_login: true, message: 'User record is invalid.' });
    }

    const match = bcrypt.compareSync(p1, user.Password);
    console.log('Password match:', match);

    if (match) {
      req.session.user = {
        ID: user.ID,
        FirstName: user.FirstName,
        LastName: user.LastName,
        Username: user.Username
      };
      return res.redirect('/');
    } else {
      return res.render('auth/login', { hide_login: true, message: 'Invalid username or password.' });
    }

  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).render('auth/login', { hide_login: true, message: 'Internal server error.' });
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

router.get('/signup', (req, res) => {
  res.render('auth/signup');
});

router.post('/signup', async (req, res) => {
  const { firstName, lastName, username, password, confirmPassword } = req.body;

  // Basic validation
  if (password !== confirmPassword) {
    return res.render('auth/signup', { error: 'Passwords do not match' });
  }

  const first = firstName.trim();
  const last = lastName.trim();
  const user = username.trim().toLowerCase(); // usernames are stored lowercase
  const pass = password.trim();

  if (pass.length < 3) {
    return res.render('auth/signup', { error: 'Password must be at least 3 characters.' });
  }

  try {
    const existingUser = await req.db.getUserByUsername(user);
    if (existingUser) {
      return res.render('auth/signup', { error: 'Username already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(pass, salt);

    const newUser = await req.db.createUser({
      FirstName: first,
      LastName: last,
      Username: user,
      Password: hashedPassword
    });

    console.log("Stored user after creation:", newUser);

    req.session.user = {
      ID: newUser.ID,
      FirstName: newUser.FirstName,
      LastName: newUser.LastName,
      Username: newUser.Username
    };

    console.log("New user session:", req.session.user);

    res.redirect('/');
  } catch (error) {
    console.error('Signup error:', error);
    res.render('auth/signup', { error: 'An error occurred during signup' });
  }
});

router.get('/create', (req, res) => {
  res.render('contacts/create', { user: req.session.user });
});

router.post('/create', async (req, res) => {
  try {
    req.body.Contact_By_Email = req.body.Contact_By_Email !== undefined;
    req.body.Contact_By_Phone = req.body.Contact_By_Phone !== undefined;
    req.body.Contact_By_Mail = req.body.Contact_By_Mail !== undefined;

    const fullAddress = `${req.body.Street}, ${req.body.City}, ${req.body.State}, ${req.body.Zip}, ${req.body.Country}`;
    
    // Use Nominatim geocoding to get lat/lng
    const geo = await req.geocoder.geocode(fullAddress);
    if (geo.length > 0) {
      req.body.Latitude = geo[0].latitude;
      req.body.Longitude = geo[0].longitude;
    } else {
      req.body.Latitude = null;
      req.body.Longitude = null;
    }

    await req.db.createContact(req.body);
    res.redirect('/');
  } catch (error) {
    console.error('Error creating contact:', error);
    res.render('contacts/create', { 
      error: 'Failed to create contact',
      user: req.session.user,
      contact: req.body
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const contact = await req.db.getContactById(req.params.id);
    if (!contact) {
      return res.status(404).render('error', { message: 'Contact not found' });
    }
    res.render('contacts/detail', { 
      contact,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).render('error', { message: 'Failed to load contact' });
  }
});

router.get('/:id/edit', requireAuth, async (req, res) => {
  try {
    const contact = await req.db.getContactById(req.params.id);
    if (!contact) {
      return res.status(404).render('error', { message: 'Contact not found' });
    }
    res.render('contacts/edit', { 
      contact,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching contact for edit:', error);
    res.status(500).render('error', { message: 'Failed to load contact' });
  }
});

router.post('/:id/edit', requireAuth, async (req, res) => {
  try {
    req.body.Contact_By_Email = req.body.Contact_By_Email !== undefined;
    req.body.Contact_By_Phone = req.body.Contact_By_Phone !== undefined;
    req.body.Contact_By_Mail = req.body.Contact_By_Mail !== undefined;

    const fullAddress = `${req.body.Street}, ${req.body.City}, ${req.body.State}, ${req.body.Zip}, ${req.body.Country}`;
    const geo = await req.geocoder.geocode(fullAddress);

    if (geo.length > 0) {
      req.body.Latitude = geo[0].latitude;
      req.body.Longitude = geo[0].longitude;
    } else {
      req.body.Latitude = null;
      req.body.Longitude = null;
    }

    await req.db.updateContact(req.params.id, req.body);
    res.redirect('/');
  } catch (err) {
    console.error('Error updating contact:', err);
    res.status(500).render('contacts/edit', {
      contact: req.body,
      error: 'Failed to update contact.',
      user: req.session.user
    });
  }
});

router.get('/:id/delete', requireAuth, async (req, res) => {
  try {
    const contact = await req.db.getContactById(req.params.id);
    if (!contact) {
      return res.status(404).render('error', { message: 'Contact not found' });
    }
    res.render('contacts/delete', { 
      contact,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching contact for delete:', error);
    res.status(500).render('error', { message: 'Failed to load contact' });
  }
});

router.post('/:id/delete', requireAuth, async (req, res) => {
  try {
    await req.db.deleteContact(req.params.id);
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).render('error', { message: 'Failed to delete contact' });
  }
});

module.exports = router;