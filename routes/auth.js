const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Url = require('../models/Url');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', (req, res) => {
  res.redirect('/login');
});

router.get('/register', (req, res) => {
  res.render('register');
});

router.post('/register', async (req, res) => {
  const { username, password, email } = req.body;  // Ensure you capture email as well
  const existingUser = await User.findOne({ username });
  if (existingUser) return res.send('Username already exists');

  const existingEmail = await User.findOne({ email });  // Check if email already exists
  if (existingEmail) return res.send('Email already registered');

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ username, password: hashedPassword, email });
  await user.save();

  res.redirect('/login');
});

router.get('/login', (req, res) => {
  res.render('login');
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.send('Invalid username or password');
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.send('Invalid username or password');
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
  res.cookie('token', token, { httpOnly: true });
  res.redirect('/dashboard');
});

router.get('/dashboard', authMiddleware, async (req, res) => {
  const urls = await Url.find({ user: req.user._id });
  res.render('dashboard', { user: req.user, urls });
});
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});
router.post('/shorten', authMiddleware, async (req, res) => {
  const { longUrl } = req.body;
  const shortCode = Math.random().toString(36).substring(2, 8);
  const url = new Url({ longUrl, shortCode, user: req.user._id });
  await url.save();
  res.redirect('/dashboard');
});

router.get('/:code', async (req, res) => {
  const url = await Url.findOne({ shortCode: req.params.code });
  if (url) {
    url.clicks++;
    await url.save();
    res.redirect(url.longUrl);
  } else {
    res.status(404).send('URL not found');
  }
});

router.post('/delete/:id', authMiddleware, async (req, res) => {
  await Url.deleteOne({ _id: req.params.id, user: req.user._id });
  res.redirect('/dashboard');
});



module.exports = router;
