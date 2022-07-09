require("dotenv").config()
const multer = require("multer")
const mongoose = require("mongoose")
const bcrypt = require("bcrypt")

const express = require("express")
const app = express()
app.use(express.urlencoded({ extended: true }))
const File = require("./models/File")
const upload = multer({ dest: "uploads" })


mongoose.connect(process.env.DATABASE_URL, (err, db) => {
    if (err) throw err;
    console.log("Connected")
})

app.set("view engine", "ejs")

app.get("/", (req, res) => {
    res.render("index")
})

app.post("/upload", upload.single("file"), async (req, res) => {
    //res.send("Hi")
    console.log("REQ.FILE", req.file)
    const fileData = {
        path: req.file.path,
        originalName: req.file.originalname
    }
    if (req.body.password != null && req.body.password !== "") {
        fileData.password = await bcrypt.hash(req.body.password, 10)
    }
    const file = await File.create(fileData)
    console.log(file)
    //res.send(file.originalName)
    console.log('REQ.HEADER', req.headers.origin)
    res.render(
        "index",
        { fileLink: `${req.headers.origin}/file/${file.id}` }
    )
})


app.route("/file/:id").get(handleDownload).post(handleDownload)

async function handleDownload(req, res) {
    //res.send(req.params.id)
    console.log('REQ.PARAMS.ID', req.params.id)
    const file = await File.findById(req.params.id)
    console.log('FILE', file.originalName)
    //IF PASSWORD IS REQUIRED TO DOWNLOAD
    if (file.password != null) {
        //IF PASSWORD ENTERED IS NULL
        if (req.body.password == null) {
            res.render("password")
        }
        //IF PASSWORD ENTERED IS NOT NULL
        else {
            console.log('REQ.BODY.PASSWORD:', req.body.password)
            //IF PASSWORD IS INCORRECT
            if (! await bcrypt.compare(req.body.password, file.password)) {
                res.render("password", { error: true })
                return
            }
            //IF PASSWORD IS NOT INCORRECT
            else {
                file.downloadCount++
                await file.save()
                console.log('Download Count', file.downloadCount)
                res.download(file.path, file.originalName)
                return
            }
        }
    }
    //IF PASSWORD IS NOT REQUIRED TO DOWNLOAD
    else {
        file.downloadCount++
        await file.save()
        console.log('Download Count', file.downloadCount)
        res.download(file.path, file.originalName)
    }
}
app.listen(3000)