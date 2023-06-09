import React, { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { TiArrowBackOutline } from "react-icons/ti";
import { BsSuitHeartFill, BsSuitHeart } from "react-icons/bs";
import { BiSend } from "react-icons/bi";
import { Link, useNavigate, useLocation } from "react-router-dom";
import SockJS from "sockjs-client";
import { Client, Stomp } from "@stomp/stompjs";
import { cookie } from "../util/cookie";
import jwtDecode from "jwt-decode";
import Loading from "../components/Loading";
import { debounce } from "lodash";
import { InView, useInView } from "react-intersection-observer";
import { useSelector } from "react-redux";

function ChattingPage() {
    const [isLoading, setIsLoading] = useState(true);
    const isConnected = useRef("");
    const stompClient = useRef(null);

    /* 전체 페이지 기록 */
    const [totalPage, setTotalPage] = useState(0);
    /* 내가 한 번 눌러서 보내는 메시지 */
    const [message, setMessage] = useState("");
    const [toggleLoading, setToggleLoading] = useState(true);

    /* 내가 이전에 받은 메시지 배열 + 내가 받아오는 메시지 배열(*내가 금방 보낸 것도 다시 받아옴) */
    const [chatMessages, setChatMessages] = useState([]);
    const [page, setPage] = useState(0);
    const [type, setType] = useState("ENTER");
    const [like, setLike] = useState(true);
    const [ref, inView] = useInView();
    const navigate = useNavigate();

    // const prevSocket = useSelector((store)=> store.socket.socket)
    // console.log("prevSocket >>> ", prevSocket)
    /* 처음 포커스 잡아주는 ref */
    const focusRef = useRef();

    const unLike = () => {
        setLike(!like);
    };
    const location = useLocation();

    const checkCookie = cookie.get("auth");
    const decodedToken = jwtDecode(checkCookie);
    const { sub: userId, exp } = decodedToken;
    /* 이 roomId 를 새로고침 했을 때도 과연 기억하는가? state에 넣어둬야 하는가? */
    const { roomId, roomName } = location.state;

    const connect = () => {
        // SockJS같은 별도의 솔루션을 이용하고자 하면 over 메소드를, 그렇지 않다면 Client 메소드를 사용해주면 되는 듯.
        stompClient.current = new Client({
            // brokerURL이 http 일경우 ws를 https일 경우 wss를 붙여서 사용하시면 됩니다!
            // brokerURL: "ws://localhost:8080/ws-stomp/websocket", // 웹소켓 서버로 직접 접속
            // brokerURL: `${process.env.REACT_APP_WEB_SOCKET_SERVER}/room`, // 웹소켓 서버로 직접 접속

            /* ws://15.164.159.168:8080/ws-stomp */
            // brokerURL: `${process.env.REACT_APP_WEB_SOCKET_SERVER}`, // 웹소켓 서버로 직접 접속
            // connectHeaders: An object containing custom headers to send during the connection handshake.
            connectHeaders: {
                Authorization: `Bearer ${checkCookie}`,
            },
            debug: (debug) => {
                console.log("debug : ", debug);
            },
            reconnectDelay: 0,

            heartbeatIncoming: 4000,

            heartbeatOutgoing: 4000,

            // 검증 부분
            webSocketFactory: () => {
                const socket = new SockJS("http://15.164.159.168:8080/ws-stomp");
                socket.onopen = function () {
                    socket.send(
                        JSON.stringify({
                            Authorization: `Bearer ${checkCookie}`,
                        })
                    );
                };
                return socket;
            },

            // 검증이 돼서 Room을 열어주는 서버랑 연결이 되면
            onConnect: async () => {
                console.log("Connected to the broker. Initiate subscribing.");
                isConnected.current = true;
                await subscribe();
                await publish();
                // await textPublish();
            },

            onStompError: (frame) => {
                console.log(frame);
                console.log("Broker reported error: " + frame.headers["message"]);
                console.log("Additional details: " + frame.body);
            },
            onWebSocketError: (frame) => {
                console.log(frame);
            },
            onWebSocketClose: () => {
                console.log("web socket closed");
            },
        });
        stompClient.current.activate();
        // Respond to non-socket browsers with SocketJS (We recommend that you consult with the server as necessary and selectively use it)
        // if (typeof WebSocket !== "function") {
        //     stompClient.current.webSocketFactory = function () {
        //         return new SockJS(
        //             `${process.env.REACT_APP_WEB_SOCKET_SERVER}`
        //             // `${process.env.REACT_APP_WEB_SOCKET_SERVER}/room`
        //         );
        //     };
        // }

        // stompClient.current.connect({})
    };

    const disconnect = () => {
        /* stompClient.current.deactivate()와 stompClient.current.disconnect()는 STOMP 프로토콜을 사용하여 서버와의 연결을 해제하는 데 사용되는 메서드입니다. 
        그러나 두 메서드는 약간 다른 동작을 수행합니다.  stompClient.current.deactivate(): 이 메서드는 현재 STOMP 클라이언트의 연결을 비활성화합니다. 
        연결이 비활성화되면 클라이언트는 서버와의 통신을 중단하고, 재활성화하기 전까지 서버로부터 메시지를 수신하지 않습니다. 
        즉, 연결은 여전히 살아있지만 데이터를 교환하지 않는 상태입니다. 클라이언트는 이후 activate() 메서드를 호출하여 연결을 다시 활성화할 수 있습니다.
        stompClient.current.disconnect(): 이 메서드는 현재 STOMP 클라이언트의 연결을 완전히 종료합니다. 
        클라이언트는 서버와의 연결을 닫고, 이후에는 해당 연결을 사용하여 데이터를 보내거나 받을 수 없습니다. 
        새로운 연결을 설정하려면 클라이언트는 다시 connect() 메서드를 호출해야 합니다. 연결을 다시 활성화할 필요가 없으며, 새로운 연결을 설정해야하는 경우에 주로 사용됩니다.
        요약하면, deactivate() 메서드는 연결을 비활성화하고 재활성화할 수 있지만, disconnect() 메서드는 연결을 완전히 종료하고 새로운 연결을 설정해야합니다. 
        어떤 메서드를 선택할지는 상황과 사용자의 요구에 따라 다를 수 있습니다. */
        // stompClient.current.deactivate();
        stompClient.current.disconnect();
        /* unsubscribe에 destination 주소를 적어주면 된다. */
        // stompClient.current.unsubscribe("/destination")
    };

    // const socket = new SockJS(
    //     "http://222.102.175.141:8080/ws-stomp"
    // );
    // stompClient.current = Stomp.over(socket);

    const subscribe = () => {
        console.log("roomID >>> ", roomId);
        stompClient.current.subscribe(
            `/sub/chat/room/${roomId}`,

            (data) => {
                console.log(" 구독이 잘 되었습니다. >>>", JSON.parse(data.body));
                const response = JSON.parse(data.body);
                // console.log("data.body>>>", data.body);
                console.log(1);

                /** @서버쪽에서_Type도_보내줬어야_했음_아니면_구별이_안_됨 */
                /* 아! scroll 했을 때도 배열로 받아오는구나!*/
                /** @지금_치고_있는_메시지가_있어도_받아오긴_해야지 */
                if (response?.data?.chatMessages) {
                    console.log("채팅배열 통과했니? >>> ", response);
                    console.log(2);
                    /** @예전_메시지는_화면에_뿌릴_때_뒤집어_줘야함 */
                    chatMessages.push(...response.data.chatMessages);

                    /** @배정현님의 어록: 의존성이 존재를 해서 그렇다. */
                    // const messageHistory = [...chatMessages, ...response.data.chatMessages];
                    // const messageHistory = [...response.data.chatMessages];
                    // setChatMessages([...messageHistory].reverse());
                    /** @page_순서는_0번째가_최신_근데_페이지_내부_요소는_0번째가_제일_예전꺼 */
                    // setChatMessages([...chatMessages].reverse());
                    setChatMessages([...chatMessages]);
                    // const nextPage = page + 1;
                    const nextPage = response.data.page;
                    console.log(nextPage);
                    setPage(nextPage + 1);
                    setTotalPage(response.data.totalPages);

                    // setType("TALK");

                    /** @보냈을_때_즉각적으로_돌아오는_건_객체여야_함 */
                } else if (data.body) {
                    // console.log("채팅객체 통과했니? >>>", response);
                    console.log(3);
                    // setPage((prevNum) => prevNum + 1);
                    /* checkPoint */
                    /* data.body가 object로 오는 경우 : 내가 보낸 메시지를 서버가 즉각적으로 response 하는 경우  */
                    /** @chatMessages_왜_초기화_됨 */
                    console.log("chatMessages >>>", chatMessages);
                    chatMessages.unshift(JSON.parse(data.body));
                    // const messageHistory = [...chatMessages, response];
                    // console.log("mshistory>>>", messageHistory);
                    setChatMessages([...chatMessages]);
                    // focusRef.current.scrollIntoView({ behavior: "smooth" });
                }
                console.log(4);
            }
            // ({ body }) => {
            //     setChatMessages((_chatMessages) => [..._chatMessages, JSON.parse(body)]);
            //   });
        );
    };

    // console.log("chatMsg >>>>>", chatMessages)

    const publish = async () => {
        if (!stompClient.current.connected) {
            return;
        }
        console.log("publish 시작");
        // if (!stompClient.current.connected) {
        //     return;
        // }
        await stompClient.current.publish({
            destination: "/pub/chat/message",
            // body: JSON.stringify({
            //     roomSeq: "63b8fe74-6adf-4bb6-94f5-b7b612dcc8b2",
            //     message: "test message",
            // }),
            /* 위에 닿았을 때 페이지 증가시키는 로직 짜야 함. */
            body: JSON.stringify({
                type: "ENTER",
                roomId,
                page,
            }),
            headers: { authorization: `Bearer ${checkCookie}` },

            //
        });
        console.log("publish 끝");
        setIsLoading(false);

        /* my message initiate */
        // setMessage("");
    };

    const textPublish = () => {
        console.log("textPublish Start");
        if (message !== "") {
            stompClient.current.publish({
                destination: "/pub/chat/message",
                // body: JSON.stringify({
                //     roomSeq: "63b8fe74-6adf-4bb6-94f5-b7b612dcc8b2",
                //     message: "test message",
                // }),
                /* 위에 닿았을 때 페이지 증가시키는 로직 짜야 함. */
                body: JSON.stringify({
                    type: "TALK",
                    roomId,
                    userId,
                    message,
                }),
                headers: { authorization: `Bearer ${checkCookie}` },
                //
            });
            console.log("textPublish End");
            setMessage("");
        }
    };

    /* Scroll */
    useEffect(() => {
        console.log("inview, totalpage >>>", inView, totalPage);
        // setType("ENTER");
        if (inView && page + 1 < totalPage) {
            console.log("page >>>", page);
            publish();
        }
    }, [inView, chatMessages]);
    // }, [fetch, hasNextPage, inView]);

    useEffect(() => {
        connect();
        if (focusRef.current) {
            focusRef.current.scrollTop = focusRef.current.scrollHeight;
        }
        // subscribe()
        // publish()
        // focusRef.current.focus()

        // 컴포넌트 언마운트 시 연결 해제 => 굳이 채팅방 넘어갈 때 구독 해제해야 하는지 생각해보자.
        // 페이지 넘어가도 소켓을 disconnect를 안했으니까 유지되고 있는 상태!
        // return () => disconnect();
    }, []);

    if (isLoading) {
        return (
            <div>
                <Loading />
            </div>
        );
    }

    return (
        <>
            <ChatRoomWrap>
                <ChatContentBox>
                    <ChatLogoImage src="../image/MainPageLogo.svg" alt="photoThumb" />
                    <ChatRoomBackIconwrap>
                        <ChatRoomBackIcon onClick={() => navigate("/chatlist")} />
                    </ChatRoomBackIconwrap>

                    <ChatProfileWrap>
                        <ChatProfileImgWrap>
                            <ChatProfileImg />
                        </ChatProfileImgWrap>

                        <ChatProfiletitleWrap>
                            <ChatProfiletitle>{roomName}</ChatProfiletitle>
                            {like ? <ChatHeartIcon onClick={unLike} /> : <ChatUnHeartIcon onClick={unLike} />}
                        </ChatProfiletitleWrap>
                    </ChatProfileWrap>

                    <ChatContentWrap ref={focusRef} inView={InView}>
                        {[...chatMessages]
                            // .slice()
                            // .reverse()
                            .map((data, idx) =>
                                data.sender === userId ? (
                                    <MyChatWrap key={idx}>
                                        <WrittenTime>{data.createdAt}</WrittenTime>
                                        <MyChat>{data.message}</MyChat>
                                    </MyChatWrap>
                                ) : (
                                    <YourChatWrap key={idx}>
                                        <YourProfileImgWrap>
                                            <YourProfileImg />
                                        </YourProfileImgWrap>
                                        <YourChat>{data.message}</YourChat>
                                        <WrittenTime>{data.createdAt}</WrittenTime>
                                    </YourChatWrap>
                                )
                            )}
                        {/* <YourChatWrap>
                        <YourProfileImgWrap>
                            <YourProfileImg />
                        </YourProfileImgWrap>
                        <YourChat>상대방 채팅 내용</YourChat><WrittenTime>작성시간</WrittenTime>
                    </YourChatWrap>
                    <MyChatWrap>
                        <WrittenTime>작성시간</WrittenTime><MyChat>사용자 채팅 내용</MyChat>
                    </MyChatWrap> */}
                        {/* <div style={{ height: "2px" }} ref={focusRef} /> */}
                        <div ref={ref}></div>
                    </ChatContentWrap>
                    <ChatInput value={message} onChange={(e) => setMessage(e.target.value)} cols="30" rows="10" />
                    <SendBtnWrap>
                        <SendBtn onClick={textPublish} />
                    </SendBtnWrap>
                </ChatContentBox>
            </ChatRoomWrap>
        </>
    );
}

const ChatRoomWrap = styled.div`
    position: relative;
    width: 100%;
    background-color: white;
    box-shadow: rgba(0, 0, 0, 0.25) 0px 14px 28px, rgba(0, 0, 0, 0.22) 0px 10px 10px;
`;

const ChatContentBox = styled.div`
    padding: 25px 20px 20px 20px;
    padding-inline: 15px;
`;

const ChatLogoImage = styled.img`
    width: 250px;
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
`;

const ChatRoomBackIconwrap = styled.div`
    width: 50px;
    height: 50px;
    background-color: ${({ theme }) => theme["borderColor"]};
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    &:hover {
        transition: all 0.3s;
        transform: scale(0.9);
    }
`;

const shakeAnimation = keyframes`
  0% { transform: translateX(0); }
  20% { transform: translateX(-3px); }
  40% { transform: translateX(3px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
  100% { transform: translateX(0); }
`;

const ChatRoomBackIcon = styled(TiArrowBackOutline)`
    color: white;
    font-size: 36px;
    cursor: pointer;
`;

const ChatProfileWrap = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 50px;
    gap: 20px;
    border-bottom: 2px solid ${({ theme }) => theme["borderColor"]};
    box-sizing: border-box;
    padding: 0px 25px 15px 25px;
`;

const ChatProfileImgWrap = styled.div`
    width: 100px;
    height: 100px;
    border-radius: 50%;
    box-shadow: rgba(0, 0, 0, 0.15) 0px 2px 8px;
`;

const ChatProfileImg = styled.div`
    width: 100%;
    height: 100%;
    background-image: url("../image/MainPageLogo.svg");
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
`;

const ChatProfiletitleWrap = styled.div`
    width: 88%;
    display: flex;
    justify-content: space-between;
`;

const ChatProfiletitle = styled.h2`
    font-size: 26px;
    font-weight: 900;
`;

const ChatHeartIcon = styled(BsSuitHeartFill)`
    color: ${({ theme }) => theme["borderColor"]};
    font-size: 36px;
    cursor: pointer;
    &:hover {
        transition: all 0.3s;
        animation: ${shakeAnimation} 0.6s;
    }
`;

const ChatUnHeartIcon = styled(BsSuitHeart)`
    color: ${({ theme }) => theme["borderColor"]};
    font-size: 36px;
    cursor: pointer;
    &:hover {
        transition: all 0.3s;
        animation: ${shakeAnimation} 0.6s;
    }
`;

const ChatContentWrap = styled.div`
    padding: 10px 25px;
    height: 400px;
    overflow-y: scroll;
    &::-webkit-scrollbar {
        display: none;
    }
    margin-bottom: 10px;
    position: relative;

    display: flex;
    flex-direction: column-reverse;
`;

const YourChatWrap = styled.div`
    display: flex;
    align-items: end;
    gap: 5px;
    margin-block: 15px;
`;

const YourChat = styled.p`
    height: 40px;
    background-color: #dddddd;
    border-radius: 16px;
    text-align: center;
    line-height: 40px;
    font-weight: 900;
    font-size: 14px;
    padding-inline: 10px;
`;

const MyChatWrap = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: end;
    gap: 5px;
    margin-block: 15px;
`;

const MyChat = styled.p`
    height: 40px;
    background-color: #00bffe;
    border-radius: 16px;
    text-align: center;
    line-height: 40px;
    font-weight: 900;
    font-size: 14px;
    padding-inline: 10px;
`;

const WrittenTime = styled.span`
    font-size: 12px;
    font-weight: 900;
    margin-bottom: 5px;
`;

const ChatInput = styled.textarea`
    position: relative;
    width: 100%;
    height: 40px;
    background-color: #e49c9c;
    padding: 11px 35px 0 20px;
    letter-spacing: 2.5px;
    line-height: 20px;
    box-sizing: border-box;
    font-size: 16px;
    font-weight: 900;
    resize: none;
    border-radius: 16px;
    box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
    &::-webkit-scrollbar {
        display: none;
    }
`;

const SendBtnWrap = styled.div`
    position: absolute;
    bottom: 22px;
    right: 25px;
    cursor: pointer;
    padding: 6px;
    box-sizing: border-box;
    border-radius: 50%;
    text-align: center;
    &:hover {
        transition: all 0.3s;
        animation: ${shakeAnimation} 0.6s;
    }
`;

const YourProfileImgWrap = styled.div`
    width: 40px;
    height: 40px;
    margin-right: 5px;
    border-radius: 50%;
    box-shadow: rgba(0, 0, 0, 0.15) 0px 2px 8px;
    background-color: rgba(254, 86, 101, 0.2);
`;

const YourProfileImg = styled.div`
    width: 100%;
    height: 100%;
    background-image: url("../image/InstaTinder.png");
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
`;

const SendBtn = styled(BiSend)`
    color: white;
    font-size: 24px;
`;

export default ChattingPage;
