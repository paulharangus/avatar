import React, {useEffect, useState} from "react";
import "./VideoComponent.css"
import AnimationSVG from "../animation/AnimationSVG";

export interface VideoComponentInterface {
    hideLogo: any,
}


const VideoComponent = (prop: any) => {
    const [visible,setVisible] = useState<boolean>(false);

    useEffect(() => {
        setVisible(prop.prop.hideLogo)
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
                    <canvas id="canvasElement" className="videoEle hide"></canvas>
                </div>
            </div>
        </div>)
}

export default VideoComponent