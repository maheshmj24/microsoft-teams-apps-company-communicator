import * as React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { withTranslation, WithTranslation } from "react-i18next";
import * as AdaptiveCards from "adaptivecards";
import { Loader, Button, Text, List, Image } from '@stardust-ui/react';
import * as microsoftTeams from "@microsoft/teams-js";

import './sendConfirmationTaskModule.scss';
import { getDraftNotification, getConsentSummaries, sendDraftNotification } from '../../apis/messageListApi';
import {
    getInitAdaptiveCard, setCardTitle, setCardImageLink, setCardSummary,
    setCardAuthor, setCardBtn
} from '../AdaptiveCard/adaptiveCard';
import { ImageUtil } from '../../utility/imageutility';

export interface IListItem {
    header: string,
    media: JSX.Element,
}

export interface IMessage {
    id: string;
    title: string;
    acknowledgements?: number;
    reactions?: number;
    responses?: number;
    succeeded?: number;
    failed?: number;
    throttled?: number;
    sentDate?: string;
    imageLink?: string;
    summary?: string;
    author?: string;
    buttonLink?: string;
    buttonTitle?: string;
}

export interface SendConfirmationTaskModuleProps extends RouteComponentProps, WithTranslation {
}

export interface IStatusState {
    message: IMessage;
    loader: boolean;
    teamNames: string[];
    rosterNames: string[];
    groupNames: string[];
    allUsers: boolean;
    messageId: number;
}

class SendConfirmationTaskModule extends React.Component<SendConfirmationTaskModuleProps, IStatusState> {
    private initMessage = {
        id: "",
        title: ""
    };

    private card: any;

    constructor(props: SendConfirmationTaskModuleProps) {
        super(props);

        this.card = getInitAdaptiveCard(this.props.t);

        this.state = {
            message: this.initMessage,
            loader: true,
            teamNames: [],
            rosterNames: [],
            groupNames: [],
            allUsers: false,
            messageId: 0,
        };
    }

    public componentDidMount() {
        microsoftTeams.initialize();

        let params = this.props.match.params;

        if ('id' in params) {
            let id = params['id'];
            this.getItem(id).then(() => {
                getConsentSummaries(id).then((response) => {
                    this.setState({
                        teamNames: response.data.teamNames.sort(),
                        rosterNames: response.data.rosterNames.sort(),
                        groupNames: response.data.groupNames.sort(),
                        allUsers: response.data.allUsers,
                        messageId: id,
                    }, () => {
                        this.setState({
                            loader: false
                        }, () => {
                            setCardTitle(this.card, this.state.message.title);
                            setCardImageLink(this.card, this.state.message.imageLink);
                            setCardSummary(this.card, this.state.message.summary);
                            setCardAuthor(this.card, this.state.message.author);
                            if (this.state.message.buttonTitle && this.state.message.buttonLink) {
                                setCardBtn(this.card, this.state.message.buttonTitle, this.state.message.buttonLink);
                            }

                            let adaptiveCard = new AdaptiveCards.AdaptiveCard();
                            adaptiveCard.parse(this.card);
                            let renderedCard = adaptiveCard.render();
                            document.getElementsByClassName('adaptiveCardContainer')[0].appendChild(renderedCard);
                            if (this.state.message.buttonLink) {
                                let link = this.state.message.buttonLink;
                                adaptiveCard.onExecuteAction = function (action) { window.open(link, '_blank'); };
                            }
                        });
                    });
                });
            });
        }
    }

    private getItem = async (id: number) => {
        try {
            const response = await getDraftNotification(id);
            this.setState({
                message: response.data
            });
        } catch (error) {
            return error;
        }
    }

    public render(): JSX.Element {
        if (this.state.loader) {
            return (
                <div className="Loader">
                    <Loader />
                </div>
            );
        } else {
            return (
                <div className="taskModule">
                    <div className="formContainer">
                        <div className="formContentContainer" >
                            <div className="contentField">
                                <h3>{this.props.t("ConfirmToSend")}</h3>
                                <span>{this.props.t("SendToRecipientsLabel")}</span>
                            </div>

                            <div className="results">
                                {this.renderAudienceSelection()}
                            </div>
                        </div>
                        <div className="adaptiveCardContainer">
                        </div>
                    </div>

                    <div className="footerContainer">
                        <div className="buttonContainer">
                            <Loader id="sendingLoader" className="hiddenLoader sendingLoader" size="smallest" label="Preparing message" labelPosition="end" />
                            <Button content={this.props.t("Send")} id="sendBtn" onClick={this.onSendMessage} primary />
                        </div>
                    </div>
                </div>
            );
        }
    }

    private onSendMessage = () => {
        let spanner = document.getElementsByClassName("sendingLoader");
        spanner[0].classList.remove("hiddenLoader");
        sendDraftNotification(this.state.message).then(() => {
            microsoftTeams.tasks.submitTask();
        });
    }

    private getItemList = (items: string[]) => {
        let resultedTeams: IListItem[] = [];
        if (items) {
            resultedTeams = items.map((element) => {
                const resultedTeam: IListItem = {
                    header: element,
                    media: <Image src={ImageUtil.makeInitialImage(element)} avatar />
                }
                return resultedTeam;
            });
        }
        return resultedTeams;
    }

    private renderAudienceSelection = () => {
        if (this.state.teamNames && this.state.teamNames.length > 0) {
            return (
                <div key="teamNames"> <span className="label">{this.props.t("TeamsLabel")}</span>
                    <List items={this.getItemList(this.state.teamNames)} />
                </div>
            );
        } else if (this.state.rosterNames && this.state.rosterNames.length > 0) {
            return (
                <div key="rosterNames"> <span className="label">{this.props.t("TeamsMembersLabel")}</span>
                    <List items={this.getItemList(this.state.rosterNames)} />
                </div>);
        } else if (this.state.groupNames && this.state.groupNames.length > 0) {
            return (
                <div>
                    <List items={this.getItemList(this.state.groupNames)} />
                </div>);
        } else if (this.state.allUsers) {
            return (
                <div key="allUsers">
                    <span className="label">{this.props.t("AllUsersLabel")}</span>
                    <div className="noteText">
                        <Text error content={this.props.t("SendToAllUsersNote")} />
                    </div>
                </div>);
        } else {
            return (<div></div>);
        }
    }
}

const sendConfirmationTaskModuleWithTranslation = withTranslation()(SendConfirmationTaskModule);
export default sendConfirmationTaskModuleWithTranslation;