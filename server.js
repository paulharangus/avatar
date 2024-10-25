const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);
const speech = require('@google-cloud/speech');
const pdf = require('pdf-parse');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(express.json());
app.use(bodyParser.json());
const origin = ['https://tr-avatar-newui-ro.ew.r.appspot.com', "http://localhost:3000/"]


const corsOptions = {
    origins: origin,
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions))
require('dotenv').config();


const openai = new OpenAI({
    apiKey: ""//process.env.OPENAI_API_KEY,
});

let systemSetup = "Use this documentation to respond and this only:";
let dataBuffer = fs.readFileSync(path.join(__dirname, 'confindustria_1.pdf'));

pdf(dataBuffer).then(function (data) {
    systemSetup = data.text;
    //console.log(systemSetup);
}).catch(function (error) {
    console.error('Failed to read system setup file:', error);
    systemSetup = "Default system setup message."; // Fallback message
});

const upload = multer({dest: '/tmp/'});
app.use(express.static(path.join(__dirname, '.')));

const speechClient = new speech.SpeechClient();

app.post('/google/transcribe', upload.single('audio'), async (req, res) => {
    // const { form, lang:any } = req.body;
    const inputPath = req.file.path;
    const format = 'wav';
    const outputPath = `${inputPath}.${format}`;

    const lang = req.body.lang;

    try {
        // Convert to a supported format if necessary
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat(format)
                .audioFrequency(16000)
                .audioChannels(1)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .saveToFile(outputPath);
        });

        const audio = {
            content: fs.readFileSync(outputPath).toString('base64'),
        };
        const config = {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: `${lang===""?"IT-it":lang}`,
        };
        const request = {
            audio: audio,
            config: config,
        };
        const [response] = await speechClient.recognize(request);
        const transcription = response.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        fs.unlinkSync(inputPath); // Clean up the original file
        fs.unlinkSync(outputPath); // Clean up the converted file
        res.json({text: transcription});
    } catch (error) {
        console.error('Error processing audio file:', error);
        res.status(500).send('Error processing your request');
    }
});

app.post('/whisper/transcribe', upload.single('audio'), async (req, res) => {
    const inputPath = req.file.path;

    const lang = req.body.lang
    const format = 'mp3'; // Define the format variable here
    const outputPath = `${inputPath}.${format}`;

    try {
        // Convert to a supported format if necessary
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .toFormat(format)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .saveToFile(outputPath);
        });


        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(outputPath),
            model: "whisper-1",
            language: `${lang}`
        });

        fs.unlinkSync(inputPath); // Clean up the original file
        fs.unlinkSync(outputPath); // Clean up the converted file
        res.json({text: transcription.text});
    } catch (error) {
        console.error('Error processing audio file:', error);
        res.status(500).send('Error processing your request');
    }
});

app.get('/openai/models', async (req, res) => {
    try {
        fetch("https://tr-multimodel-ro.ew.r.appspot.com/api/models").then((response)=>{
            return response.json()
        }).then((data) =>{
            res.json({text: JSON.stringify(data)});
        })
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        res.status(500).send('Error processing your request');
    }

})


app.post('/openai/complete', async (req, res) => {

    try {
        const prompt = req.body.prompt;
        systemSetup="Keep in mind not to mention the name OpenAI"
        const chatCompletion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: systemSetup},
                { role: 'user', content: prompt }
            ],
            model: 'gpt-4o',
        });
        res.json({ text: chatCompletion.choices[0].message.content });
    } catch (error) {
        console.error('Error calling OpenAI:', error);
        res.status(500).send('Error processing your request');
    }

    // try {
    //     const prompt = req.body.prompt;
    //     const model = req.body.model
    //     const data_send_external_server = {
    //         "model_name": model,
    //         "prompt": "Respond in 100-150 words for text:" + prompt
    //     }
    //     fetch("https://tr-multimodel-ro.ew.r.appspot.com/api/generate", {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify(data_send_external_server)
    //     }).then((res) => {
    //         return res.json()
    //     }).then((data) => {
    //         let message = ""
    //         if(Array.isArray(data.response))
    //             message = data.response.join(" ")
    //         else {
    //             message = data.response
    //         }
    //         res.json({text: message});
    //     })
    // } catch (error) {
    //     console.error('Error calling OpenAI:', error);
    //     res.status(500).send('Error processing your request');
    // }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, function () {
    console.log(`App is listening on port ${PORT}!`);
});