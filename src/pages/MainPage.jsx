import { darken, lighten } from "polished";
import React, { useState } from "react";
import { styled } from "styled-components";
import Buttons from "../components/assets/Button";
import { ToastContainer, toast } from "react-toastify";
import { Link, useNavigate } from "react-router-dom";

function MainPage() {
    const navigate = useNavigate();
    const moveToSignIn = () => {
        navigate("/signin");
    };

    return (
        <>
            <Dark></Dark>
            <Wrapper>
                <Canvas>
                    <StButton
                        size="small"
                        bgColor="itemColor"
                        onClick={moveToSignIn}
                    >
                        Login
                    </StButton>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                        }}
                    >
                        <img
                            style={{
                                width: "1324px",
                                height: "251px",
                            }}
                            src="../image/MainPageLogo.svg"
                            alt="photoThumb"
                        />
                        <WelcomeText>
                            마음에 드는 친구와 대화해 보세요!
                        </WelcomeText>
                    </div>
                    <Link to={'/match'}>
                        <Buttons size="large" bgColor="itemColor">
                            Matching Start
                        </Buttons>
                    </Link>
                </Canvas>
            </Wrapper>
        </>
    );
}

const Dark = styled.div`
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 0;
`;

const WelcomeText = styled.div`
    width: 1837px;
    height: 257px;

    font-family: "Inter";
    font-style: normal;
    font-weight: 400;
    font-size: 90px;
    line-height: 133px;
    text-align: center;

    color: #ffffff;
`;

const Wrapper = styled.div`
    width: 100vw;
    height: 100vh;
    background: url("../image/MainBackImg.png") no-repeat;
    background-size: cover;
    /* filter: brightness(80%); */
`;

const Canvas = styled.div`
    width: 100%;
    height: 100vh;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 40px;
    z-index: 1;
`;

const StButton = styled(Buttons)`
    position: absolute;
    top: 30px;
    right: 45px;
    /* @media(max-width: 800px){
        .div{
            display: none;
        }
    } */
`;

// const StButton = styled.button`
//     font-size: 40px;
//     box-sizing: border-box;
//     color: white;
//     padding-inline: 120px;
//     padding-block: 30px;
//     border-radius: 16px;
//     cursor: pointer;
//     position: absolute;
//     top: 0px;
//     right: 5px;

//     background: ${({ theme }) => theme["itemColor"]};
//     position: relative;
//     &:hover {
//         /* background: ${({ theme }) =>
//             lighten(0.1, theme["buttonHoverColor"])}} */
//         filter: brightness(115%);
//         transition: all 0.2s;
//     }
//     &:active {
//         filter: brightness(80%);
//         transition: all 0.2s;
//     }
// `;

export default MainPage;
