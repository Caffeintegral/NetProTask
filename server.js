var http = require("http");
var socketIO = require("socket.io");
var fs = require("fs");
var admin = require('firebase-admin');
var serviceAccount = require('../FirebaseAdminSDK_netPro.json'); //秘密鍵　抜かれたらやばいやつ

//データベースの定義
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://netpro-3c4a0.firebaseio.com/" //データベースのURL
});

var db = admin.database();
var messages = db.ref('messages/'); //データベースの階層
var messageRef = db.ref('messages/room1/'); //データベースの階層
var usersRef = db.ref('users/room1/'); //データベースの階層

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
var userSet = {};
var userList = [];
var count = 0;
var userCount = 0;
var draws = [];

// 接続されたら、connected!とコンソールにメッセージを表示します。
io.sockets.on("connection", function (socket) {
  // console.log("connected");
  // console.log(draws);
  if (draws.length > 0) {
    socket.emit('firstsend', draws);
  }

  // クライアントからメッセージ受信
  socket.on('clearsend', function () {
    console.log("delete");
    draws = [];
    // 自分以外の全員に送る
    socket.broadcast.emit("delete");

    // 描画情報クリア

  });


  //接続したとき（入室したとき）
  socket.on("connected", function (sender) {
    var msg = sender + "さんが入室しました";
    userHash[socket.id] = sender;
    userSet[count] = sender;
    usersRef.child(count).set({
      name: sender,
      isNowPlayer: false
    });
    userList.push(sender);
    console.log(userSet);
    console.log(msg);
    console.log(userList);
    count++;
  });
  //リロードとかページから離れた時
  socket.on("disconnect", function () {
    if (userHash[socket.id]) {
      var msg = userHash[socket.id] + "さんが退出しました";
      messageRef.push({
        sender: userHash[socket.id],
        message: msg
      });

      var senderValue = Object.keys(userSet).filter((key) => {
        return userSet[key] === userHash[socket.id]
      });

      console.log(senderValue);
      db.ref('users/room1/' + senderValue + '/').remove();

      userList.pop();
      usersRef.child(userHash[socket.id]).remove();
      delete userHash[socket.id];
      console.log(userList);
      console.log(msg);

    }

    if (userList.length == 0) { //誰もいなくなったとき部屋消してる（正確には誰もいなくなった後誰かがアクセスしたとき）
      usersRef.set({
        0: "",
      });
      count = 0;
      db.ref('nowPlayer/room1').set({ name: '未定' });
      db.ref('nowPlayerCounter/room1').set({
        count: 0,
      });
      db.ref('beforeAnswer/room1/').set({
        beforeAnswer: "しりとり"
      })
      db.ref('img/room1/').set({
        imgUrl: ""
      })
    }

  });

  //ここから下がとりあえずコピペした絵を描くやつのサーバ側
  // 接続時、描画情報があれば送信

  // 描画情報がクライアントから渡されたら、接続中の他ユーザーへ
  // broadcastで描画情報を送ります。
  // ちなみに、最近のsocket.IOでは、イベント名(以下だとdraw)は
  // 自由にネーミング出来るようになったようです。便利！！
  socket.on("draw", function (data) {
    // console.log(data);
    draws.push(data);
    // console.log(draws);
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





});

