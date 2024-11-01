import React, {useEffect, useState} from "react";
import {
    BackgroundInterface, closeConnectionHandler,
    createNewSession, hideElement, messageTextSubject, messageVoiceSubject, renderCanvas,
    SessionInterface, showElement,
    startAndDisplaySession, startListen,
    talkHandler, Voice
} from "../../servers/services/sessionService";
import "./mainComponent.css"
import AnimationSVG from "../animation/AnimationSVG";
import VideoComponent, { hidingLogo, VideoComponentInterface} from "../videoSection/VideoComponent";
import MessageComponent, {MessageInterface} from "../messageComponent/MessageComponent";
import ListComponent from "../ListComponet/ListComponent";
import {Subject} from "rxjs";
import {AvatarInterface, StyleInterface} from "../Modals/SettingsModal/SettingsModal";
import {avatarSubject, settingsSubject} from "../../App";
import {wait} from "@testing-library/user-event/dist/utils";
import Cookies from 'js-cookie';

export interface MainComponentInterface{
    avatar:AvatarInterface,
    reRender:any,
    setReRender:any,
    style:StyleInterface
}

export const ButtonDissableSubject = new Subject<boolean>()
export const MainComponent = ({ avatar, reRender, setReRender,style }:MainComponentInterface) => {
    ///debuging
    const debug = false;


    //Define variables
    const [connection, setConnection] = useState<boolean>(false)
    let [message, setMessage] = useState<string>("")
    //Define Html code elements
    const avatarId = avatar.avatarId;
    const voiceId = avatar.voiceId;
    const background = "url(\"'https://www.cleanpng.com/png-background-transparent-png-clipart-4998260/'\") center / contain no-repeat"
    const statusElement = document.querySelector('#status');
    const [canvasElement, setCanvasElement] = useState<Element | null>(null);
    const [visibleCanvasElement, setVisibleCanvasElement] = useState(false);
    const [hideLogo, setHideLogo] = useState(false)

    const [cookieMessage, setCookieMessage] = useState<string|undefined>('');

    const saveMessageToCookies = (msg:string) => {
        Cookies.set('message', msg, { expires: 7 });
        setCookieMessage(msg);
    };

    const loadMessageFromCookies = () => {
        const msg = Cookies.get('message');
        setCookieMessage(msg || 'No message found');
    };

    const [re_opened, setRe_opened] = useState(false)

    useEffect(() => {
        loadMessageFromCookies();

        const intervalId = setInterval(() => {
            const currentMsg = Cookies.get('message');
            if (currentMsg !== cookieMessage) {
                // alert(`Cookie message changed: ${currentMsg}`);
                console.log(`Cookie message changed: ${currentMsg}`)
                setCookieMessage(currentMsg);
                if(currentMsg === "stopServer"){
                    if (sesionInternface) {
                        closeConnectionHandler(sesionInternface)
                        // window.location.reload();
                        hidingLogo.next("a")
                        setTimeout(()=>{
                            saveMessageToCookies("NotLoaded");
                            // setConnection(false)
                            setSesionInterface(undefined)}
                            ,2000)
                    }
                }
            }
        }, 1000); // Check every second

        return () => clearInterval(intervalId); // Cleanup on unmount
    }, [cookieMessage]);

    useEffect(() => {
        saveMessageToCookies("NotLoaded")
    }, []);


    useEffect(() => {
        if(reRender){
            if (sesionInternface) {
                closeConnectionHandler(sesionInternface);

                const data = wait(5000);
                hideElement(canvasElement)
                // showElement(sesionInternface.mediaElement)
                // setConnection(false);
                setHideLogo(false);
                // showElement(sesionInternface.mediaElement)
                data.then(()=>{
                    doInit()
                    const load = wait(2000);
                    load.then(()=>{
                        showElement(canvasElement)
                        const storage = localStorage.getItem("localSettings");
                        if(storage) {
                            const message = JSON.parse(storage)
                            talkHandler(sesionInternface, {taskInput: "Ciao!(italian)"});
                        } else {
                            talkHandler(sesionInternface, {taskInput: "Ciao!(italian)"});
                        }
                    })
                })

            }
            setReRender(false);
        }
    }, [reRender]);


    const reopen = () =>{
        doInit()
        hidingLogo.next("b")
        const load = wait(2000);
        load.then(()=>{
            showElement(canvasElement)
            const storage = localStorage.getItem("localSettings");
            if(storage) {
                const message = JSON.parse(storage)
                if (sesionInternface) {
                    talkHandler(sesionInternface, {taskInput: "Ciao!(italian)"});
                }
            } else {
                if (sesionInternface) {
                    talkHandler(sesionInternface, {taskInput: "Ciao!(italian)"});
                }
            }
        })
    }

    ///OnInitalization
    const doInit = () => {
        messageVoiceSubject.subscribe({
            next: (value: Voice) => {
                if (value.session) {
                    updateStatus(value.data, 0);
                    talkHandler(value.session, {taskInput: value.data})
                }
            },
        })

        createNewSession({
            isDictating: false,
            mediaRecorder: null,
            srcObject: undefined,
            avatarID: avatarId,
            mediaElement: document.querySelector('#mediaElement'),
            peerConnection: null,
            sessionInfo: null,
            statusElement: statusElement,
            updateStatus: updateStatus,
            voiceID: voiceId
        }).then((value: any) => {
            // setHideLogo(true);
            setSesionInterface(value);
            saveMessageToCookies("Loading");
            startSession(value);
        })
    }


    const renderBk = (val: SessionInterface) => {
        const bkt: BackgroundInterface = {
            bgInput: {value: background},
            canvasElement: canvasElement,
            mediaElement: val.mediaElement,
            renderID: 0
        }

        setHideLogo(true)
        renderCanvas(bkt);
        const storage = localStorage.getItem("localSettings");
        if(storage) {
                const message = JSON.parse(storage)
                talkHandler(val, {taskInput: "Ciao!(italian)"});
        } else {
            talkHandler(val, {taskInput: "Ciao!(italian)"});
        }
    }

    useEffect(() => {
        if (canvasElement) {
            hideElement(sesionInternface?.mediaElement);
            showElement(canvasElement)

            const timer = setTimeout(() => {
                setVisibleCanvasElement(true);
            }, 2000);

            return () => clearTimeout(timer);

        }
    }, [canvasElement]);

    useEffect(() => {
        if (visibleCanvasElement) {
            if (sesionInternface) {
                renderBk(sesionInternface);
            }
        }
    }, [visibleCanvasElement]);

    const updateStatus = (message: any, priority?: number) => {
        if (priority === undefined) {
            if (!debug) {
                return;
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        // @ts-ignore
        // document.querySelector('#status').innerHTML += `${message}<br>`;
        // eslint-disable-next-line @typescript-eslint/no-unused-expressions
        // @ts-ignore
        // document.querySelector('#status').scrollTop = document.querySelector('#status').scrollHeight;
    }


    const [sesionInternface, setSesionInterface] = useState<SessionInterface>();


    const returnSession = () =>{
        return sesionInternface;
    }


    const startSession = (session: SessionInterface | undefined) => {
        if (session !== undefined) {
            setConnection(true);
        }
        if (session) {
            setHideLogo(true)
            startAndDisplaySession(session).then((value: any) => {
                setSesionInterface(value)
                console.log(value.srcObject)
                setCanvasElement(document.querySelector('#canvasElement'));
            })
        }
    };


    const returnVideoComponentInterface = () => {
        const data: VideoComponentInterface = {hideLogo: hideLogo}


        return data;
    }

    const returnMessageInterface = ()=>{
        const messageInterface:MessageInterface = {
            style:style,
            connection: connection,
            doInit: doInit,
            message: message,
            sesionInternface: sesionInternface,
            reOpen: reopen,
            setMessage: setMessage,
            updateStatus: updateStatus
        }

        return messageInterface;
    }


    return (
        <div className="main">

            <ListComponent/>
            <MessageComponent  messageInterface = {returnMessageInterface()}/>

            <div>
                <VideoComponent prop={returnVideoComponentInterface()}/>
            </div>
        </div>
    );
}