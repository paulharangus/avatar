import React, {useEffect, useState} from "react";
import "./ListComponent.css"
import {List, ListItem} from "semantic-ui-react";
import {messageTextSubject, questionSubject} from "../../servers/services/sessionService";
import {downlandChat, hideChat} from "../messageComponent/MessageComponent";


const ListComponent = () => {
    const [data, setData] = useState<string[]>([]);
    const [load, setLoad] = useState<boolean>(false);
    const [newData, setNewData] = useState<string>("");
    const [visible, setVisible] = useState<boolean>(false);
    const [downland, setDownland] = useState(false);
    const [questions, setQuestions] = useState<string[]>([]);


    const [dataTimestamp, setDataTimestamp] = useState<string[]>([]);
    const [questionsTimestamp, setQuestionsTimestamp] = useState<string[]>([]);

    const getCurrentTime = () => {
        const date = new Date();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    };

    useEffect(() => {
        if (downland) {
            console.log(mergeLists());
            const mergeList = mergeLists()
            const blob = new Blob([mergeList.join('\n')], {type: 'text/plain'});
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.download = 'chat.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setDownland(false);
        }
    }, [downland]);


    const mergeLists = () => {
        const messageList = []
        for (let i = 0; i < data.length; i++) {
            messageList.push(`[${questionsTimestamp[i]}]-` + questions[i])
            messageList.push(`[${dataTimestamp[i]}]-` + data[i]);
        }

        return messageList
    }

    useEffect(() => {
        setLoad(true);
    }, []);

    useEffect(() => {
        if (load) {
            hideChat.subscribe({
                next: (value: boolean) => {
                    setVisible(value);
                }
            })
            messageTextSubject.subscribe({
                next: (value: string) => {
                    setNewData(value);
                },
            })
            questionSubject.subscribe({
                next: (value) => {
                    questions.push(value);
                    questionsTimestamp.push(getCurrentTime());
                }
            })
            downlandChat.subscribe({
                next: () => {
                    setDownland(true);
                }
            })
        }
    }, [load]);

    useEffect(() => {
        if (newData === "") {
            // console.log(1)
            return
        }
        let dataToRefresh: string[] = [];

        for (let i = 0; i < data.length; i++) {
            dataToRefresh.push(data[i]);
        }
        dataToRefresh.push(newData);
        setData(dataToRefresh)
        // dataTimestamp.push((Math.floor(Date.now() / 1000)).toString());
        dataTimestamp.push(getCurrentTime());
        // console.log(data);
        setNewData("");
    }, [newData]);

    return (
        <>

            <div className={"listContainer"}>
                {(visible) ? (<List>
                    {data.map(function (d, idx) {
                        const totalItems = data.length;
                        let opacity = ((idx + 1) / totalItems) * 100;
                        if (opacity === 100) {
                            opacity = opacity - 30
                        }
                        return (
                            <div style={{paddingBottom: "10px", paddingLeft: "5%", opacity: `${opacity}%`}}>
                                <div>
                                    <div style={{right: "-36%", position: "relative"}}>
                                        <ListItem className={"listItem"}>{questions[idx]}</ListItem>
                                    </div>
                                    <ListItem className={"listItem"} key={idx}>{d}</ListItem>

                                </div>
                            </div>
                        )
                    })}
                </List>) : (<div/>)}

            </div>
        </>
    )
}

export default ListComponent