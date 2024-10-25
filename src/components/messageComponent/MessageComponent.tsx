import {
    analyzeMedia,
    messageVoiceSubject,
    SessionInterface,
    startListen,
    talkHandler
} from "../../servers/services/sessionService";
import React, {useEffect, useState} from "react";
import "./MessageComponent.css"
import {Icon, Input} from "semantic-ui-react";
// import 'semantic-ui-css/semantic.min.css';
import {Subject} from "rxjs";
import {StyleInterface} from "../Modals/SettingsModal/SettingsModal";
import {ButtonDissableSubject} from "../mainPage/mainComponent";


export const hideChat = new Subject<boolean>();
export const downlandChat = new Subject<number>();
export const stopRecording = new Subject<boolean>();
export const closeMicrophone = new Subject<boolean>();


export interface MessageInterface {
    connection: any,
    doInit: any,
    setMessage: any,
    updateStatus: any,
    sesionInternface: any,
    message: any,
    style: StyleInterface
}


const darkenColor = (color: any, percent: any) => {
    let num = parseInt(color.slice(1), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) - amt;
    let B = (num >> 8 & 0x00FF) - amt;
    let G = (num & 0x0000FF) - amt;

    return "#" + (0x1000000 + (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 + (G < 255 ? (G < 1 ? 0 : G) : 255)).toString(16).slice(1);
};


const MessageComponent = (messageInterface: any) => {
    const [visible, setVisible] = useState<boolean>(false);
    const [hover, setHover] = useState(0);
    const [listening, setListening] = useState<boolean>();
    const [media, setMedia] = useState<MediaRecorder>();

    let audioChunks: any = [];
    const [load, setLoad] = useState<boolean>(false);
    const [session, setSession] = useState<SessionInterface>()
    const [dissable, setDissable] = useState(false)

    useEffect(() => {
        const timer = setTimeout(() => {
            setLoad(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);


    async function hasLongPauseInAudio(blob: Blob, silenceThreshold: number = 0.01, minPauseDuration: number = 4000): Promise<boolean> {
        // Create an AudioContext
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Read the blob and decode the audio data
        const arrayBuffer = await blob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get the channel data
        const channelData = audioBuffer.getChannelData(0); // Use the first channel
        const sampleRate = audioContext.sampleRate;

        let isSilent = true;
        let pauseStart: number | null = null;

        for (let i = 0; i < channelData.length; i++) {
            const sampleValue = Math.abs(channelData[i]);

            // Check if the sample value is below the silence threshold
            if (sampleValue < silenceThreshold) {
                if (isSilent) {
                    // If we were silent, continue counting
                    if (pauseStart === null) {
                        pauseStart = i; // Mark start of silence
                    }
                } else {
                    // We just detected a pause
                    isSilent = true;
                    pauseStart = i; // Reset pause start
                }
            } else {
                if (isSilent) {
                    // We were silent and just detected sound
                    const pauseDuration = (i - pauseStart!) / sampleRate * 1000; // Convert to milliseconds
                    if (pauseDuration >= minPauseDuration) {
                        return true; // Return true if a long pause is detected
                    }
                }
                isSilent = false;
                pauseStart = null;
            }
        }

        // Final check at end of buffer in case it ends with silence
        if (isSilent && pauseStart !== null) {
            const pauseDuration = (channelData.length - pauseStart) / sampleRate * 1000; // Convert to milliseconds
            if (pauseDuration >= minPauseDuration) {
                return true; // Return true if a long pause is detected at the end
            }
        }

        return false; // Return false if no long pauses are found
    }

    useEffect(() => {
        if (load) {
            ButtonDissableSubject.subscribe({
                next: (value) => {
                    setDissable(value)
                }
            })

            closeMicrophone.subscribe({
                next:(value)=>{
                    setListening(undefined)
                }
            })

            navigator.mediaDevices.getUserMedia({audio: true})
                .then(function (stream) {

                    const mediaRecorder = new MediaRecorder(stream);


                    // setTimeout(function () {
                    //     media?.stop();
                    //     setListening(undefined);
                    // }, 20000);
                    setMedia(mediaRecorder);
                })
                .catch(function (err) {
                    console.error('Error accessing microphone:', err);
                });
        }
    }, [load]);

    function calculateReadingTime(text:string, wordsPerMinute = 180) {
        // Count the number of words in the text
        const wordCount = text.split(/\s+/).length;

        // Calculate reading time in minutes
        const readingTimeMinutes = wordCount / wordsPerMinute;

        // Convert to seconds (optional for more detail)
        const readingTimeSeconds = Math.round(readingTimeMinutes * 60);

        // Return both formats
        return {
            minutes: readingTimeMinutes.toFixed(2),
            seconds: readingTimeSeconds
        };
    }

    useEffect(() => {
        if (session) {
            // // @ts-ignore
            // media.onstop = () => {
            //     const audioBlob = new Blob(audioChunks, {type: 'audio/wav'});
            //     const formData = new FormData();
            //     formData.append("audio", audioBlob, "audio.wav");
            //     if (session) {
            //         analyzeMedia(formData, session)
            //     }
            // }
            // @ts-ignore
            media.ondataavailable = (event: any) => {
                audioChunks.push(event.data);
                const audioBlob = new Blob([...audioChunks, event.data], {type: 'audio/wav'});

                // Check for long pauses in the recorded audio
                const hasLongPause = hasLongPauseInAudio(audioBlob).then((res: boolean) => {
                    if (res) {
                        setListening(undefined)
                        media?.stop();
                    }
                });
                console.log('Has long pause of 4 seconds:', hasLongPause);
            };


            // @ts-ignore
            media.onstop = () => {
                setDissable(true)
                const audioBlob = new Blob(audioChunks, {type: 'audio/wav'});
                const formData = new FormData();
                formData.append("audio", audioBlob, "audio.wav");
                audioChunks = []
                if (session) {
                    analyzeMedia(formData, session).then((value)=>{
                        console.log(value)
                        if(value === ""){
                            setListening(false)
                            return;
                        }
                        const time = calculateReadingTime(value).seconds + 25
                        console.log(time)
                        setTimeout(function () {
                            setListening(true)
                        }, time * 1000);
                        setListening(false)
                    })
                }
            }
        }
    }, [session]);
    useEffect(() => {
        if (listening === undefined) {
            return
        }

        if (listening) {
            media?.start(2000);
        } else {
            media?.stop()
        }

    }, [listening]);
    const onHover = (value: number) => {
        setHover(value);
    }

    const offHover = () => {
        setHover(0);
    }


    function isShadeOfRed(hex: string): boolean {
        // Validate the hex color code
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
            throw new Error("Invalid hex color code");
        }

        // Convert hex to RGB
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        // Determine if the color is a shade of red
        // You might adjust these thresholds as needed
        const redThreshold = 150;
        const greenBlueMax = 100;

        return r > redThreshold && g < greenBlueMax && b < greenBlueMax;
    }

    const returnCollorSettingsB1 = () => {
        const nullColor = isShadeOfRed(messageInterface.messageInterface.style.color) ? "grey" : "red"
        const baseColor = hover !== 1 ? messageInterface.messageInterface.style.color : darkenColor(messageInterface.messageInterface.style.color, 20)
        return !dissable ? baseColor : nullColor
    }

    const returnCollorSettingsB2 = () => {
        const nullColor = isShadeOfRed(messageInterface.messageInterface.style.color) ? "grey" : "red"
        const baseColor = hover !== 2 ? messageInterface.messageInterface.style.color : darkenColor(messageInterface.messageInterface.style.color, 20)
        return !dissable ? baseColor : nullColor
    }


    const [currentMessege, setCurrentMessege] = useState("")
    return (
        <div className="actionRowsWrap">
            <div className="actionRow">
                <label style={{width: "fit-content", minWidth: "70%"}}>
                    {/*Message*/}
                    <input id="taskInput" className={"taskInput"} type="text" value={currentMessege} onClick={() => {
                        console.log(messageInterface.messageInterface)
                        if (!messageInterface.messageInterface.connection) {
                            messageInterface.messageInterface.doInit()
                        }
                    }} onChange={(value) => {
                        messageInterface.messageInterface.setMessage(value.target.value)
                        setCurrentMessege(value.target.value)
                    }}/>
                </label>
                <div className={"buttonDiv"}>
                    <button

                        onMouseEnter={() => {
                            onHover(1)
                        }}
                        onMouseLeave={offHover}
                        id="talkBtn"
                        style={
                            {backgroundColor: `${returnCollorSettingsB1()}`}
                        }
                        disabled={!messageInterface.messageInterface.connection || dissable} onClick={() => {
                        messageInterface.messageInterface.updateStatus(messageInterface.messageInterface.message, 0);
                        if (messageInterface.messageInterface.sesionInternface) {
                            if (!dissable)
                                setDissable(true)
                            talkHandler(messageInterface.messageInterface.sesionInternface, {taskInput: messageInterface.messageInterface.message}).then(() => {
                                setDissable(false)
                                setCurrentMessege("")
                            })
                        }
                    }}>
                        <Icon onMouseEnter={() => {
                            onHover(1)
                        }} name="send" inverted/>
                    </button>
                    <button
                        onMouseEnter={() => {
                            onHover(2)
                        }}
                        onMouseLeave={offHover}
                        disabled={dissable}
                        id="whisperBtn"
                        style={{backgroundColor: `${returnCollorSettingsB2()}`}}
                        onClick={() => {
                            if (dissable)
                                return
                            if (!messageInterface.messageInterface.connection) {
                                messageInterface.messageInterface.doInit()
                            }
                            if (messageInterface.messageInterface.sesionInternface) {
                                setSession(messageInterface.messageInterface.sesionInternface)
                                if (!listening) {
                                    // startListen(messageInterface.messageInterface.sesionInternface)
                                    setListening(true)
                                } else {
                                    setListening(false);
                                    // stopRecording.next(true);
                                }
                            }

                        }}>
                        {!listening?<Icon name="microphone" inverted/>:<Icon name="mute" inverted/>}
                    </button>
                    <button
                        onMouseEnter={() => {
                            onHover(3)
                        }}
                        onMouseLeave={offHover}

                        id="dowlandButton"
                        style={{backgroundColor: `${hover !== 3 ? messageInterface.messageInterface.style.color : darkenColor(messageInterface.messageInterface.style.color, 20)}`}}
                        onClick={() => {
                            downlandChat.next(1);
                        }}><Icon name="download" inverted/>
                    </button>
                    <button
                        onMouseEnter={() => {
                            onHover(4)
                        }}
                        onMouseLeave={offHover}

                        id="hideButton"
                        style={{backgroundColor: `${hover !== 4 ? messageInterface.messageInterface.style.color : darkenColor(messageInterface.messageInterface.style.color, 20)}`}}
                        onClick={() => {
                            hideChat.next(visible)
                            setVisible(!visible);
                        }}><Icon name="file text" inverted/></button>
                </div>
            </div>
        </div>
    )
}

export default MessageComponent