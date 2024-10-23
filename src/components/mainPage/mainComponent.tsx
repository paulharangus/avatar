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
import VideoComponent, {VideoComponentInterface} from "../videoSection/VideoComponent";
import MessageComponent, {MessageInterface} from "../messageComponent/MessageComponent";
import ListComponent from "../ListComponet/ListComponent";
import {Subject} from "rxjs";
import {AvatarInterface, StyleInterface} from "../Modals/SettingsModal/SettingsModal";
import {avatarSubject, settingsSubject} from "../../App";
import {wait} from "@testing-library/user-event/dist/utils";

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
            setSesionInterface(value)
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