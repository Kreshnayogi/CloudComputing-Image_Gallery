const express = require('express'); // Importing Express framework
const multer = require('multer'); // Importing Multer for file uploads
const AWS = require('aws-sdk'); // Importing AWS SDK for interacting with AWS services
const path = require('path'); // Importing path module for handling file paths

const app = express(); // Creating an instance of an Express application

require('dotenv').config();

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(express.json()); // Built-in middleware to parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Built-in middleware to parse URL-encoded bodies

// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  const params = {
    Bucket: 'cloud-storage-project',
    Key: req.file.originalname,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error('Upload error:', err);
      return res.status(500).json({ error: 'Failed to upload file' });
    }
    res.status(200).json({ message: 'File uploaded successfully', data: data });
  });
});

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// List files route
app.get('/files', (req, res) => {
  const params = {
    Bucket: 'cloud-storage-project',
  };

  s3.listObjectsV2(params, (err, data) => {
    if (err) {
      console.error('List files error:', err);
      return res.status(500).send(err);
    }

    const files = data.Contents.map(file => {
      return {
        key: file.Key,
        url: s3.getSignedUrl('getObject', { Bucket: 'cloud-storage-project', Key: file.Key, Expires: 60 * 60 })
      };
    });

    console.log('Files:', files);  // Log the files to check keys and URLs
    res.status(200).json(files);
  });
});

// Download file route
app.get('/download/:key', (req, res) => {
  const params = {
    Bucket: 'cloud-storage-project',
    Key: req.params.key,
  };

  s3.getObject(params, (err, data) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.attachment(req.params.key);
    res.send(data.Body);
  });
});

// Delete file route
app.delete('/delete-file', (req, res) => {
  const { fileName } = req.body;

  const params = {
    Bucket: 'cloud-storage-project',
    Key: fileName
  };

  s3.deleteObject(params, (err, data) => {
    if (err) {
      console.error('Error deleting file:', err);
      return res.status(500).send(`Failed to delete file: ${err.message}`);
    }
    console.log('Delete response:', data);
    res.send(`File ${fileName} deleted successfully`);
  });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
