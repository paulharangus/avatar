import React, {useEffect, useState} from 'react';
import './AnimationSVG.css';
import imgData from "../videoSection/logo.png"


const SvgAnimation = () => {
    const [svgPath, setSvgPath] = useState('');

    useEffect(() => {
        fetch('/data.json')
            .then(response => response.json())
            .then(data => setSvgPath(data.svg))
            .catch(error => console.error('Error loading data:', error));
    }, []);

    return (
        <div className="svg-animation-container">
            <img src={imgData} datatype={imgData}/>
            {/*{svgPath ? (*/}
            {/*        <object*/}
            {/*            id="elem"*/}
            {/*            className="videoEle show"*/}
            {/*            type="image/svg+xml"*/}
            {/*            data={svgPath}*/}
            {/*        >*/}
            {/*            Your browser does not support SVG*/}
            {/*        </object>*/}
            {/*    ): (*/}
            {/*    <div>Loading...</div>*/}
            {/*    )}*/}
        </div>
    );
};

export default SvgAnimation;