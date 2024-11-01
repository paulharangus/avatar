import React, {useEffect, useState} from "react";
import "./VideoComponent.css"
import AnimationSVG from "../animation/AnimationSVG";
import {Subject} from "rxjs";

export interface VideoComponentInterface {
    hideLogo: any,
}

export const hidingLogo = new Subject<string>()

const VideoComponent = (prop: any) => {
    const [visible,setVisible] = useState<boolean>(false);

    useEffect(() => {
        setVisible(prop.prop.hideLogo)
        hidingLogo.subscribe({
            next:(value)=>{
                if(value !== "b"){
                    setVisible(false)
                    return
                }
                setVisible(true)
            }
        })
    }, [prop.prop.hideLogo]);

    return (
        <div>
            {
                (!visible) ? (
                        <div className={"svgAnimation"}>
                            <AnimationSVG/>
                        </div>
                    )
                    : (
                        <div>
                        </div>
                    )}

            <div className="videoSectionWrap">
                <div className="videoWrap" hidden={!prop.prop.hideLogo}>
                    <video id="mediaElement" className="videoEle show" autoPlay></video>
                    <canvas style={{visibility:visible?"visible":"hidden"}} id="canvasElement" className="videoEle hide"></canvas>
                </div>
            </div>
        </div>)
}

export default VideoComponent