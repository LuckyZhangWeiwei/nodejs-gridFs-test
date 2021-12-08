const express = require("express");
const app = express();
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const fs = require("fs");
const multer = require("multer");
const { GridFsStorage } = require("multer-gridfs-storage");
const bodyparser = require("body-parser");

app.use(bodyparser.json());

app.set("view engine", "ejs");

//mongodb uri
const mongouri =
  "mongodb://root:root@172.28.210.42:27017/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false";

const conn = mongoose.createConnection(mongouri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

//gridfs variable
let gfs;

conn.once("open", () => {
  gfs = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: "userdocs" });
});

//create file storage
const storage = new GridFsStorage({
  url: mongouri,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        //const filename = buf.toString('hex') + path.extname(file.originalname);
        const filename = file.originalname;
        const fileinfo = {
          filename: filename,
          bucketName: "userdocs",
        };
        resolve(fileinfo);
      });
    });
  },
});
const upload = multer({ storage });

//root path
app.get("/", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/html",
  });
  fs.readFile("./index.html", null, function (error, data) {
    if (error) {
      res.writeHead(404);
      res.write("Oops! Unable to load main page.");
    } else {
      res.write(data);
    }
    res.end();
  });
});

//post file
app.post("/upload", upload.single("file"), (req, res) => {
  console.log(req.file.originalname);
  res.json({ file: req.file.originalname });
});

//show all files
app.get("/files", (req, res) => {
  gfs.find().toArray((err, files) => {
    if (!files || files.length === 0) {
      return res.status(404).json({
        err: "No file exist",
      });
    }
    return res.json(files);
  });
});

//search files by original name
app.get("/file/:fileId", async (req, res) => {
  let files = await gfs
    .find({
      _id: new mongoose.mongo.ObjectId(req.params.fileId),
    })
    .toArray();
  if (files && files.length) {
    const readstream = gfs.openDownloadStream(
      new mongoose.mongo.ObjectId(req.params.fileId)
    );
    readstream.pipe(res);
  } else {
    return res.status(404).json({
      err: "No file exist",
    });
  }
});

app.get("/delete/:fileId", async (req, res) => {
  let files = await gfs
    .find({ _id: new mongoose.mongo.ObjectId(req.params.fileId) })
    .toArray();
  if (files && files.length) {
    await gfs.delete(files[0]._id);
    return res.status(200).json({
      err: "successful",
    });
  } else {
    return res.status(404).json({
      err: "No file exist",
    });
  }
});

const port = 3001;

app.listen(port, () => console.log("Server started on port " + port));
