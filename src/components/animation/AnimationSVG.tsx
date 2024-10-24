import React, {useEffect, useState} from 'react';
import './AnimationSVG.css';
import imgData from "../videoSection/logo_confindustria-1.png"


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
            <img style={{    position: "relative",left: "90px"}} src={"https://34.154.18.23/wp-content/uploads/2024/10/logo_confindustria-1.png"} datatype={"http://34.154.18.23/wp-content/uploads/static/media/logo_confindustria-1.png"}/>
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