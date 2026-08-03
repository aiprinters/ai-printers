const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');

const store = require('./store');
const shopsRouter = require('./routes/shops');
const jobsRouterFactory = require('./routes/jobs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/shops', shopsRouter);
app.use('/api/jobs', jobsRouterFactory(io));

// Customer print page — same file for every shop, the slug is read
// client-side from the URL.
app.get('/s/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'print.html'));
});

// Print agents connect over Socket.io and authenticate with their
// shop's slug + agent token before joining that shop's private room.
io.on('connection', (socket) => {
  socket.on('auth', ({ slug, token }) => {
    const shop = store.getShopBySlug(slug);

    if (!shop || shop.agentToken !== token) {
      socket.emit('auth-failed', { error: 'Invalid shop slug or agent token.' });
      return;
    }

    socket.join(`shop:${shop.id}`);
    socket.emit('auth-ok', { shopName: shop.name });
    console.log(`Print agent connected for shop "${shop.name}" (${shop.slug})`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`AI Printers backend running at http://localhost:${PORT}`);
});
