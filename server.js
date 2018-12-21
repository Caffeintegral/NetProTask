var http = require("http");
var socketIO = require("socket.io");
var fs = require("fs");
var admin = require('firebase-admin');
var serviceAccount = require('../FirebaseAdminSDK_netPro.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://netpro-3c4a0.firebaseio.com/" //データベースのURL
});

var db = admin.database();
var ref = db.ref('messages/room1/');

var server = http.createServer(function (req, res) {
  res.writeHead(200, { "Content-Type": "text/html" });
  var output = fs.readFileSync("./public/index.html", "utf-8");
  res.end(output);
});
console.log('listening on localhost:3000');
server.listen(3000);

// socket.IOを用いたリアルタイムWebを実装します。
var io = socketIO.listen(server);
var userHash = {};

// 接続されたら、connected!とコンソールにメッセージを表示します。
io.sockets.on("connection", function (socket) {
  console.log("connected");

  // 描画情報がクライアントから渡されたら、接続中の他ユーザーへ
  // broadcastで描画情報を送ります。
  // ちなみに、最近のsocket.IOでは、イベント名(以下だとdraw)は
  // 自由にネーミング出来るようになったようです。便利！！
  socket.on("draw", function (data) {
    console.log(data);
    socket.broadcast.emit("draw", data);
  });

  // 色変更情報がクライアントからきたら、
  // 他ユーザーへ変更後の色を通知します。
  socket.on("color", function (color) {
    console.log(color);
    socket.broadcast.emit("color", color);
  });

  // 線の太さの変更情報がクライアントからきたら、
  // 他ユーザーへ変更後の線の太さを通知します。
  socket.on("lineWidth", function (width) {
    console.log(width);
    socket.broadcast.emit("lineWidth", width);
  });

  socket.on("connected", function (sender) {
    var msg = sender + "さんが入室しました";
    userHash[socket.id] = sender; console.log(msg);
  });

  socket.on("disconnect", function () {
    if (userHash[socket.id]) {
      var msg = userHash[socket.id] + "さんが退出しました";
      ref.push({
        sender: userHash[socket.id],
        message: msg
      });
      delete userHash[socket.id];
      io.sockets.emit("publish", { value: msg });
      console.log(msg);
    }

  });
});


