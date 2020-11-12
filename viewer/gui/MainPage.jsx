/**
 * Created by andreas on 02.05.14.
 */

import navobjects from '../nav/navobjects';
import Dynamic from '../hoc/Dynamic.jsx';
import Visible from '../hoc/Visible.jsx';
import Button from '../components/Button.jsx';
import ItemList from '../components/ItemList.jsx';
import globalStore from '../util/globalstore.jsx';
import keys from '../util/keys.jsx';
import React from 'react';
import PropertyHandler from '../util/propertyhandler.js';
import history from '../util/history.js';
import Page from '../components/Page.jsx';
import Toast from '../components/Toast.jsx';
import Requests from '../util/requests.js';
import MapHolder from '../map/mapholder.js';
import base from '../base.js';
import chartImage from '../images/Chart60.png';
import GuiHelper from '../util/GuiHelpers.js';
import LayoutFinishedDialog from '../components/LayoutFinishedDialog.jsx';
import Mob from '../components/Mob.js';
import Addons from '../components/Addons.js';
import EditOverlaysDialog from '../components/EditOverlaysDialog.jsx';



const getImgSrc=function(color){
    if (color == "red") return globalStore.getData(keys.properties.statusErrorImage);
    if (color == "green") return globalStore.getData(keys.properties.statusOkImage);
    if (color == "yellow")return globalStore.getData(keys.properties.statusYellowImage);
};

class BottomLine extends React.Component {
        constructor(props) {
            super(props);
            this.state = {status:{}};
            this.timer = GuiHelper.lifecycleTimer(this,
                this.timerCall,
                globalStore.getData(keys.properties.positionQueryTimeout), true);
            this.timerCall = this.timerCall.bind(this);
            GuiHelper.storeHelperState(this,'gps',{
                valid: keys.nav.gps.valid,
                connectionLost: keys.nav.gps.connectionLost
            })
        }

        timerCall(sequence) {
            if (sequence != this.timer.currentSequence()) return;
            Requests.getJson("?request=nmeaStatus")
                .then((json)=> {
                    this.setState({status: json.data});
                    this.timer.startTimer(sequence);
                })
                .catch((error)=> {
                    this.setState({status: {}});
                    this.timer.startTimer(sequence);
                })
        }

        render() {
            //we have the raw nmea in "raw"
            let nmeaColor = !this.state.gps.connectionLost ? "yellow" : "red";
            let aisColor = !this.state.gps.connectionLost ? "yellow" : "red";
            let nmeaText = !this.state.gps.connectionLost ? "" : "server connection lost";
            let aisText = "";
            if (!this.state.gps.connectionLost) {
                if (this.state.status && this.state.status.nmea) {
                    nmeaColor = this.state.status.nmea.status;
                    nmeaText = this.state.status.nmea.source + ":" + this.state.status.nmea.info;
                }
                if (this.state.status && this.state.status.ais) {
                    aisColor = this.state.status.ais.status;
                    aisText = this.state.status.ais.source + ":" + this.state.status.ais.info;
                }
            }
            return (
                <div className='footer'>
                    <div className='inner'>
                        <div className='status'>
                            <div >
                                <img className='status_image' src={getImgSrc(nmeaColor)}/>
                                NMEA&nbsp;{nmeaText}
                            </div>
                            {!this.state.gps.connectionLost ? <div >
                                <img className='status_image' src={getImgSrc(aisColor)}/>
                                AIS&nbsp;{aisText}
                            </div> : null
                            }
                        </div>
                        <div className="link">
                            <div > AVNav Version <span >{avnav.version}</span></div>
                            <div><a href="http://www.wellenvogel.de/software/avnav/index.php" className="extLink">www.wellenvogel.de/software/avnav/index.php</a>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    };

const ChartItem = (props)=> {
    let cls="chartItem";
    if (props.selected) cls+=" activeEntry";
    if (props.originalScheme) cls+=" userAction";
    let isConnected=globalStore.getData(keys.properties.connectedMode,false);
    return (
        <div className={cls} onClick={props.onClick}>
            <img src={props.icon||chartImage}/>
            <span className="chartName">{props.name}</span>
            {isConnected && <Button
                className="smallButton"
                name="MainOverlays"
                onClick={(ev)=>{
                    ev.stopPropagation();
                    EditOverlaysDialog.createDialog(props);
                }}
                />}
        </div>
    );
};

class MainPage extends React.Component {
    constructor(props) {
        super(props);
        this.state={
            chartList:[],
            addOns:[],
            selectedChart:0,
            status:{}
        };
        GuiHelper.storeHelperState(this,'reload',{sequence:keys.gui.global.reloadSequence})
        let self=this;
        this.selectChart(0);
        GuiHelper.keyEventHandler(this,(component,action)=>{
            if (action == "selectChart"){
                let chartlist=globalStore.getData(keys.gui.mainpage.chartList);
                let selected=globalStore.getData(keys.gui.mainpage.selectedChartIndex,0);
                if (chartlist && chartlist[selected]){
                    showNavpage(chartlist[selected]);
                }
            }
            if (action == "nextChart"){
                self.selectChart(1);
            }
            if (action == "previousChart"){
                self.selectChart(-1);
            }
        },"page",["selectChart","nextChart","previousChart"]);

    }

    getButtons() {
        return [
            {
                name: 'ShowStatus',
                onClick: ()=> {
                    history.push('statuspage')
                },
                editDisable: true
            },
            {
                name: 'ShowSettings',
                onClick: ()=> {
                    history.push('settingspage')
                }
            },
            {
                name: 'ShowDownload',
                onClick: ()=> {
                    history.push('downloadpage')
                },
                editDisable: true
            },
            {
                name: 'Connected',
                storeKeys: [keys.gui.global.onAndroid, keys.properties.connectedMode, keys.gui.capabilities.canConnect],
                updateFunction: (state, skeys) => {
                    return {
                        visible: !state[keys.gui.global.onAndroid] && state[keys.gui.capabilities.canConnect] == true,
                        toggle: state[keys.properties.connectedMode]
                    }
                },
                onClick: ()=> {
                    let con = globalStore.getData(keys.properties.connectedMode, false);
                    con = !con;
                    globalStore.storeData(keys.properties.connectedMode, con);
                },
                editDisable: true
            },
            {
                name: 'ShowGps',
                onClick: ()=> {
                    history.push('gpspage')
                }
            },
            {
                name: 'Night',
                storeKeys: {toggle: keys.properties.nightMode},
                onClick: ()=> {
                    let mode = globalStore.getData(keys.properties.nightMode, false);
                    mode = !mode;
                    globalStore.storeData(keys.properties.nightMode, mode);
                },
                editDisable: true
            },
            Mob.mobDefinition,
            LayoutFinishedDialog.getButtonDef(),

            {
                name: 'MainCancel',
                storeKeys: {visible: keys.gui.global.onAndroid},
                onClick: ()=> {
                    avnav.android.goBack()
                }

            },
            {
                name: 'MainAddOns',
                onClick: ()=> {
                    history.push('addonpage')
                },
                visible: this.state.addOns.length > 0,
                editDisable: true
            }
        ];
    }


    componentDidMount() {
        globalStore.storeData(keys.gui.global.soundEnabled,true);
        this.readAddOns();
        this.fillList();
    }

    selectChart(offset){
        let len=(this.state.chartList||[]).length;
        let currentIndex=this.state.selectedChart;
        let newIndex=currentIndex+offset;
        if (newIndex >= len){
            newIndex=0;
        }
        if (newIndex < 0){
            newIndex=0;
        }
        if (newIndex != currentIndex){
            this.setState({selectedChart:newIndex});
        }
    };


    fillList() {
        Requests.getJson("?request=list&type=chart",{timeout:3*parseFloat(globalStore.getData(keys.properties.networkTimeout))}).then((json)=>{
                let items = [];
                for (let e in json.items) {
                    let chartEntry = json.items[e];
                    if (chartEntry.key) chartEntry.key=chartEntry.name;
                    items.push(chartEntry);
                }
                this.setState({chartList:items});
            },
            (error)=>{
                Toast("unable to read chart list: "+error);
            });
    };
    readAddOns() {
        Addons.readAddOns(true)
            .then((items)=>{
                this.setState({addOns: items});
            })
            .catch(()=>{});
    };

    render() {
        let self = this;

        return (
            <Page
                  className={this.props.className}
                  style={this.props.style}
                  id="mainpage"
                  title="AvNav"
                  mainContent={
                    <ItemList className="mainContent"
                               itemClass={ChartItem}
                               onItemClick={showNavpage}
                               itemList={this.state.chartList}
                               selectedIndex={this.state.selectedChart}
                               scrollable={true}
                               listRef={(list)=>{
                                    if (!list) return;
                                    let selected=list.querySelector('.activeEntry');
                                    let mode=GuiHelper.scrollInContainer(list,selected);
                                    if (mode < 1 || mode > 2) return;
                                    selected.scrollIntoView(mode==1);
                               }}
                        />
                        }
                  bottomContent={
                    <BottomLine />
                    }
                  buttonList={self.getButtons()}
                  dummy={self.state.status}
                />
        );


    }


}




/**
 * the click handler for the charts
 * @param entry - the chart entry
 */
const showNavpage = function (entry) {
    base.log("activating navpage with url " + entry.url);
    MapHolder.setChartEntry(entry);
    history.push('navpage');

};



export default MainPage;