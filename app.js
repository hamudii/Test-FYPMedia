const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const session = require('express-session');
const path = require('path');
const app = express();
const upload = multer({ dest: 'public/uploads/' });
const bcrypt = require('bcrypt');
const saltRounds = 10;
require("./mongo")

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'my_secret_key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

const PORT = process.env.PORT || 3000;

const {Article} = require("./model/article.js")
const {User} = require("./model/user.js")

// Middleware untuk memeriksa apakah user sudah login
function checkAuthenticated(req, res, next) {
  if (req.session.user) {
    return next();
  }
  res.redirect('/login');
}

app.get('/', (req, res) => {
    res.render('index');
});
  
app.get('/dashboard', checkAuthenticated, async (req, res) => {
    const articles = await Article.find().sort({ createdAt: 'desc' });
    res.render('dashboard', { articles });
});
  

app.get('/login', (req, res) => {
    if (req.session.user) {
      res.send('Anda sudah login.');
    } else {
      res.render('login');
    }
  });
  

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (user && bcrypt.compareSync(password, user.password)) {
    req.session.user = user._id;
    res.redirect('/');
  } else {
    res.send('Username atau password salah!');
  }
});

app.get('/signup', (req, res) => {
    if (req.session.user) {
        res.send('Anda sudah login.');
    }else{
        res.render('signup');
    }
});

app.post('/signup', async (req, res) => {
    try {
      const { username, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const newUser = new User({
        username,
        password: hashedPassword
      });
      await newUser.save();
      res.redirect('/login');
    } catch (error) {
      res.status(500).send('Error saat membuat user baru: ' + error.message);
    }
});

app.post('/upload', checkAuthenticated, upload.single('article'), async (req, res) => {
  const { title, content } = req.body;
  const article = new Article({
    title,
    content,
    imagePath: `/uploads/${req.file.filename}`
  });
  await article.save();
//   res.status(201).json({ message: 'Artikel berhasil diupload!', articleId: article._id });
  res.redirect("/")
});

app.get('/articles', async (req, res) => {
    const articles = await Article.find();
    res.status(200).json(articles);
});

app.get('/article/:id', checkAuthenticated, async (req, res) => {
    try {
      const article = await Article.findById(req.params.id);
      if (!article) {
        // Send a 404 response and terminate the function execution
        return res.status(404).send('Artikel tidak ditemukan');
      }
      res.render('article', { article });
    } catch (error) {
      // Handle errors and terminate the function execution
      return res.status(500).send(error.message);
    }
  });

app.listen(PORT, () => {
  console.log(`Server berjalan pada http://localhost:${PORT}`);
});