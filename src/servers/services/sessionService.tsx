import {Subject} from 'rxjs';
import {closeMicrophone, stopRecording} from "../../components/messageComponent/MessageComponent";
import {ButtonDissableSubject} from "../../components/mainPage/mainComponent";


const heygen_API = {
    apiKey: 'Y2RmNzA4NTUxMWE0NGJkMjhhOWI2OWE5NTQ2ZGJlYmItMTcxMTcwNjYzMA==',
    serverUrl: 'https://api.heygen.com',
};

const apiKey = heygen_API.apiKey;
const SERVER_URL = heygen_API.serverUrl;
const localServer:string = "https://server1-dot-tr-avatar-newui-ro.ew.r.appspot.com"
// const localServer: string = "http://localhost:3001"


export interface Voice {
    data: string,
    session: any
}

export const messageVoiceSubject = new Subject<Voice>();
export const messageTextSubject = new Subject<string>();
export const questionSubject = new Subject<string>()


export interface SessionInterface {
    updateStatus: (value: string) => void;
    statusElement: any;
    avatarID: any;
    voiceID: any;
    sessionInfo: any;
    peerConnection: any;
    mediaElement: any;
    srcObject: any;
    isDictating: boolean;
    mediaRecorder: any;
}


export interface Task {
    taskInput: string;
}


function onMessage(event: any) {
    const message = event.data;
    console.log('Received message:', message);
}

export async function createNewSession(sessionInterface: SessionInterface) {

    sessionInterface.updateStatus('Creating new session... please wait');

    const avatar = sessionInterface.avatarID;
    const voice = sessionInterface.voiceID;

    // call the new interface to get the server's offer SDP and ICE server to create a new RTCPeerConnection
    sessionInterface.sessionInfo = await newSession('low', avatar, voice, sessionInterface);


    const {sdp: serverSdp, ice_servers2: iceServers} = sessionInterface.sessionInfo;

    // Create a new RTCPeerConnection
    sessionInterface.peerConnection = new RTCPeerConnection({iceServers: iceServers});

    // When audio and video streams are received, display them in the video element
    sessionInterface.peerConnection.ontrack = (event: any) => {
        console.log('Received the track');
        if (event.track.kind === 'audio' || event.track.kind === 'video') {
            sessionInterface.mediaElement.srcObject = event.streams[0];
        }
    };

    // When receiving a message, display it in the status element
    sessionInterface.peerConnection.ondatachannel = (event: any) => {
        const dataChannel = event.channel;
        dataChannel.onmessage = onMessage;
    };

    // Set server's SDP as remote description
    const remoteDescription = new RTCSessionDescription(serverSdp);
    await sessionInterface.peerConnection.setRemoteDescription(remoteDescription);

    sessionInterface.updateStatus('Session creation completed');
    sessionInterface.updateStatus('Now.You can click the start button to start the stream');


    return sessionInterface;
}


async function newSession(quality: any, avatar_name: any, voice_id: any, sessionInterface: any) {
    const response = await fetch(`${SERVER_URL}/v1/streaming.new`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
        },
        body: JSON.stringify({
            quality: "high",
            avatar_name,
            voice: {
                voice_id: voice_id,
            },
        }),
    });
    console.log(quality, 'quaality')
    if (response.status === 500) {
        console.error('Server error');
        sessionInterface.updateStatus(
            sessionInterface.statusElement,
            'Server Error. Please ask the staff if the service has been turned on',
        );

        throw new Error('Server error');
    } else {
        const data = await response.json();
        console.log(data.data);
        return data.data;
    }
}


export async function startAndDisplaySession(sessionInterface: SessionInterface) {

    if (!sessionInterface.sessionInfo) {
        sessionInterface.updateStatus('Please create a connection first');
        return;
    }

    sessionInterface.updateStatus('Starting session... please wait');

    // Create and set local SDP description
    const localDescription = await sessionInterface.peerConnection.createAnswer();
    await sessionInterface.peerConnection.setLocalDescription(localDescription);

    // When ICE candidate is available, send to the server
    // @ts-ignore
    sessionInterface.peerConnection.onicecandidate = ({candidate}) => {
        console.log('Received ICE candidate:', candidate);
        if (candidate) {
            handleICE(sessionInterface.sessionInfo.session_id, candidate.toJSON(), sessionInterface);
        }
    };

    // When ICE connection state changes, display the new state
    sessionInterface.peerConnection.oniceconnectionstatechange = (event: any) => {
        sessionInterface.updateStatus(
            `ICE connection state changed to: ${sessionInterface.peerConnection.iceConnectionState}`,
        );
    };

    // Start session
    await startSession(sessionInterface.sessionInfo.session_id, localDescription, sessionInterface);

    sessionInterface.updateStatus('Session started successfully');

    return sessionInterface
}

// start the session
async function startSession(session_id: any, sdp: any, sesionInterface: SessionInterface) {
    const response = await fetch(`${SERVER_URL}/v1/streaming.start`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
        },
        body: JSON.stringify({session_id, sdp}),
    });
    if (response.status === 500) {
        console.error('Server error');
        sesionInterface.updateStatus(
            'Server Error. Please ask the staff if the service has been turned on',
        );
        throw new Error('Server error');
    } else {
        const data = await response.json();
        return data.data;
    }
}

// submit the ICE candidate
async function handleICE(session_id: any, candidate: any, sesionInterface: SessionInterface) {
    const response = await fetch(`${SERVER_URL}/v1/streaming.ice`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
        },
        body: JSON.stringify({session_id, candidate}),
    });
    if (response.status === 500) {
        console.error('Server error');
        sesionInterface.updateStatus(
            'Server Error. Please ask the staff if the service has been turned on',
        );
        throw new Error('Server error');
    } else {
        const data = await response.json();
        return data;
    }
}


export async function talkHandler(sessionInterface: SessionInterface, task: Task) {
    if (!sessionInterface.sessionInfo) {
        sessionInterface.updateStatus('Please create a connection first');
        return;
    }
    const prompt = task.taskInput; // Using the same input for simplicity
    if (prompt.trim() === '') {
        alert('Please enter a prompt for the LLM');
        return;
    }

    sessionInterface.updateStatus('Talking to LLM... please wait');

    try {
        const text = await talkToOpenAI(prompt, sessionInterface)

        if (text) {
            // Send the AI's response to Heygen's streaming.task API
            repeat(sessionInterface.sessionInfo.session_id, text, sessionInterface);
            messageTextSubject.next(text);
            questionSubject.next(task.taskInput)
            sessionInterface.updateStatus('LLM response sent successfully');
        } else {
            sessionInterface.updateStatus('Failed to get a response from AI');
        }
        if(prompt === "Respond with and only with `You did not say anything so I will stop your microphone!`")
            return ""
        return text;
    } catch (error) {
        console.error('Error talking to AI:', error);
        sessionInterface.updateStatus('Error talking to AI');
    }
}


export async function getModels() {
    return fetch(`${localServer}/openai/models`)

    // .then((data)=>{
    //     return data.json()
    // }).then((data)=>{
    //     console.log(data)
    // })
}

async function talkToOpenAI(prompt: any, sessionInterface: SessionInterface) {
    const model = localStorage.getItem("model")
    const response = await fetch(`${localServer}/openai/complete`, { //http://localhost:3000
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({prompt, model}),
    });
    if (response.status === 500) {
        console.error('Server error');
        sessionInterface.updateStatus(
            'Server Error. Please make sure to set the openai api key',
        );
        throw new Error('Server error');
    } else {
        const data = await response.json();
        return data.text;
    }
}

async function repeat(session_id: any, text: string, sessionInterface: SessionInterface) {
    const response = await fetch(`${SERVER_URL}/v1/streaming.task`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
        },
        body: JSON.stringify({session_id, text}),
    });
    if (response.status === 500) {
        console.error('Server error');
        sessionInterface.updateStatus(
            'Server Error. Please ask the staff if the service has been turned on',
        );
        throw new Error('Server error');
    } else {
        const data = await response.json();
        return data.data;
    }
}


// export async function enableWhisper(sessionInterface:SessionInterface,taskInput:any,isDictating:any,setIsDictating:any) {
//     if (!isDictating) {
//         try {
//             // Request permission to access audio stream
//             const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//             // Create a MediaRecorder instance
//             sessionInterface.mediaRecorder = new MediaRecorder(stream);
//             let audioChunks:any = [];
//             let lastText = '';
//
//             sessionInterface.mediaRecorder.addEventListener("dataavailable", (event: { data: any; }) => {
//                 audioChunks.push(event.data);
//             });
//
//             const unwantedSentences = [
//                 "Sottotitoli creati dalla comunità Amara.org",
//                 "Al prossimo episodio",
//                 "Alla prossima!",
//                 "Alla prossima.",
//                 "Ciao e alla prossima",
//                 "Sottotitoli e revisione a cura di QTSS",
//                 "sottotitoli e revisione a cura di QTSS",
//                 "Al prossimo episodio...",
//                 "Sottotitoli a cura di QTSS",
//                 "Ciao. Ciao."
//             ];
//
//             sessionInterface.mediaRecorder.addEventListener("stop", async () => {
//                 // Combine audio chunks into a single Blob
//                 const audioBlob = new Blob(audioChunks);
//                 // Create a FormData to send the audio file
//                 const formData = new FormData();
//                 formData.append("audio", audioBlob, "audio.wav");
//
//                 // Send the audio file to the server
//                 const response = await fetch('/google/transcribe', {
//                     method: 'POST',
//                     body: formData
//                 });
//
//                 const data = await response.json();
//                 if (data.text && !unwantedSentences.includes(data.text)) {
//                     // Set the transcription text as the value of the taskInput element
//                     taskInput.value = data.text;
//                     sessionInterface.updateStatus( `Transcription: ${data.text}`);
//                     lastText = data.text;
//
//                     // Manually trigger the input event
//                     taskInput.dispatchEvent(new Event('input'));
//                 } else {
//                     console.log('Unwanted message');
//                 }
//                 audioChunks = [];
//             });
//
//             // Start recording
//             sessionInterface.mediaRecorder.start();
//             setIsDictating(true);
//             sessionInterface.updateStatus('Dictation enabled');
//
//             // Continuously record and process audio
//             setInterval(() => {
//                 if (sessionInterface.mediaRecorder.state === 'recording') {
//                     sessionInterface.mediaRecorder.stop();
//                 }
//                 sessionInterface.mediaRecorder.start();
//             }, 7000); // Adjust the interval as needed
//
//         } catch (error) {
//             console.error('Error enabling Whisper:', error);
//             sessionInterface.updateStatus( 'Error enabling Whisper');
//         }
//     } else {
//         if (sessionInterface.mediaRecorder && sessionInterface.mediaRecorder.state === 'recording') {
//             sessionInterface.mediaRecorder.stop();
//             sessionInterface.mediaRecorder = null;
//         }
//         sessionInterface.isDictating = false;
//         sessionInterface.updateStatus('Dictation disabled');
//     }
//
//     return sessionInterface
// }

const unwantedSentences = [
    "Sottotitoli creati dalla comunità Amara.org",
    "Al prossimo episodio",
    "Alla prossima!",
    "Alla prossima.",
    "Ciao e alla prossima",
    "Sottotitoli e revisione a cura di QTSS",
    "sottotitoli e revisione a cura di QTSS",
    "Al prossimo episodio...",
    "Sottotitoli a cura di QTSS",
    "Ciao. Ciao."
];


export const analyzeMedia = async (form: FormData, session: SessionInterface) => {
    const langStr = localStorage.getItem("localSettings")
    let lang = ""
    if (langStr) {
        lang = JSON.parse(langStr).lang
    }
    form.append("lang", lang)
    let response: Response;
    response = await fetch(`${localServer}/google/transcribe`, {
        method: 'POST',
        body: form
    });

    const data = await response.json();
    console.log(data)
    ButtonDissableSubject.next(false);
    // messageVoiceSubject.next({data:data.text,session:session});

    if (data.text === "") {
        // closeMicrophone.next(true);
        return talkHandler(session, {taskInput: "Respond with and only with `You did not say anything so I will stop your microphone!`"})
    }

    const talk = talkHandler(session, {taskInput: data.text})
    return talk
}


export const startListen = async (session: SessionInterface) => {


    navigator.mediaDevices.getUserMedia({audio: true})
        .then(function (stream) {
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks: any = [];

            mediaRecorder.addEventListener('dataavailable', function (event) {
                audioChunks.push(event.data);
            });

            mediaRecorder.addEventListener('stop', async function () {
                const audioBlob = new Blob(audioChunks, {type: 'audio/wav'});
                const formData = new FormData();
                formData.append("audio", audioBlob, "audio.wav");

                let response: Response;
                response = await fetch(`${localServer}/google/transcribe`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                console.log(data)
                messageVoiceSubject.next({data: data.text, session: session});

            });

            mediaRecorder.start();
            stopRecording.subscribe({
                next: () => {
                    mediaRecorder.stop();
                    stopRecording.complete();
                }
            })

            setTimeout(function () {
                mediaRecorder.stop();
            }, 7000); // Change this duration as needed
        })
        .catch(function (err) {
            console.error('Error accessing microphone:', err);
        });
}

export interface BackgroundInterface {
    mediaElement: any;
    canvasElement: any;
    renderID: number;
    bgInput: any;
}

export function renderCanvas(background: BackgroundInterface) {

    background.canvasElement.classList.add('show');

    const curRenderID = Math.trunc(Math.random() * 1000000000);
    background.renderID = curRenderID;

    const ctx = background.canvasElement.getContext('2d', {willReadFrequently: true});

    if (background.bgInput.value) {
        background.canvasElement.parentElement.style.background = background.bgInput.value?.trim();
    }
    const Width = background.mediaElement.videoWidth
    const Height = background.mediaElement.videoHeight

    console.log(Width)
    console.log(Height)

    function processFrame() {

        background.canvasElement.width = background.mediaElement.videoWidth;
        background.canvasElement.height = background.mediaElement.videoHeight;

        ctx.drawImage(background.mediaElement, 0, 0, background.canvasElement.width, background.canvasElement.height);
        ctx.getContextAttributes().willReadFrequently = true;
        const imageData = ctx.getImageData(0, 0, 1080, 1080);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const red = data[i];
            const green = data[i + 1];
            const blue = data[i + 2];

            if (isCloseToGreen([red, green, blue])) {
                data[i + 3] = 0;
            }
        }

        ctx.putImageData(imageData, 0, 0);

        requestAnimationFrame(processFrame);
    }

    processFrame();
}

function isCloseToGreen(color: any) {
    const [red, green, blue] = color;
    return green > 90 && red < 90 && blue < 90;
}

export function hideElement(element: any) {
    element.classList.add('hide');
    element.classList.remove('show');
}

export function showElement(element: any) {
    element.classList.add('show');
    element.classList.remove('hide');
}

export async function closeConnectionHandler(sessionInterface: SessionInterface, backGroundInterface?: BackgroundInterface) {
    if (!sessionInterface.sessionInfo) {
        sessionInterface.updateStatus('Please create a connection first');
        return;
    }


    try {
        sessionInterface.peerConnection.close();
        const resp = await stopSession(sessionInterface.sessionInfo.session_id);

        console.log(resp);
    } catch (err) {
        console.error('Failed to close the connection:', err);
    }
}

async function stopSession(session_id: number) {
    const response = await fetch(`${SERVER_URL}/v1/streaming.stop`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Api-Key': apiKey,
        },
        body: JSON.stringify({session_id}),
    });
    if (response.status === 500) {
        console.error('Server error');
        // updateStatus(statusElement, 'Server Error. Please ask the staff for help');
        throw new Error('Server error');
    } else {
        const data = await response.json();
        return data.data;
    }
}