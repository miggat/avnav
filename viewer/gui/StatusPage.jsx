/**
 * Created by andreas on 02.05.14.
 */

import Dynamic from '../hoc/Dynamic.jsx';
import Button from '../components/Button.jsx';
import ItemList from '../components/ItemList.jsx';
import globalStore from '../util/globalstore.jsx';
import keys from '../util/keys.jsx';
import React from 'react';
import Page from '../components/Page.jsx';
import Toast from '../components/Toast.jsx';
import Requests from '../util/requests.js';
import OverlayDialog from '../components/OverlayDialog.jsx';
import GuiHelpers from '../util/GuiHelpers.js';
import Mob from '../components/Mob.js';
import EditHandlerDialog from "../components/EditHandlerDialog";
import DB from '../components/DialogButton';
import {Checkbox, Input} from "../components/Inputs";
import LogDialog from "../components/LogDialog";
import assign from "object-assign";
import Compare from "../util/compare";
import PropTypes from 'prop-types';
import Helper from "../util/helper";

class Notifier{
    constructor() {
        this.callbacks={}
    }
    register(cb){
        if (cb) this.callbacks[cb]=cb;
        else delete this.callbacks[cb];
    }
    trigger(data){
        for (let k in this.callbacks){
            if (this.callbacks[k]) this.callbacks[k](data);
        }
    }
}

class DebugDialog extends React.Component{
    constructor(props) {
        super(props);
        this.state={
            isDebug:false,
            pattern:'',
            timeout:60
        };
        this.save=this.save.bind(this);
    }
    componentDidMount() {
        Requests.getJson('',undefined,{
            request:'currentloglevel'
        })
            .then((data)=>{
                let ns={};
                ns.isDebug=(data.level && data.level.match(/debug/i));
                ns.pattern=data.filter||'';
                this.setState(ns);
            })
            .catch((e)=>Toast(e))
    }

    save(){
        Requests.getJson('',undefined,{
            request:'debuglevel',
            level: this.state.isDebug?'debug':'info',
            timeout:this.state.timeout,
            filter:this.state.pattern ||''
        })
            .then(()=>this.props.closeCallback())
            .catch((e)=>Toast(e));
    }
    render(){
        return <div className="selectDialog DebugDialog">
            <h3 className="dialogTitle">{this.props.title||'Enable/Disable Debug'}</h3>
            <Checkbox
                dialogRow={true}
                label={'debug'}
                value={this.state.isDebug}
                onChange={(nv)=>this.setState({isDebug:nv})}
                />
            <Input
                type={'number'}
                label={'timeout(s)'}
                dialogRow={true}
                value={this.state.timeout}
                onChange={(nv)=>this.setState({timeout:nv})}/>
            <Input
                label={'pattern'}
                dialogRow={true}
                value={this.state.pattern}
                onChange={(nv)=>this.setState({pattern:nv})}/>
            <div className="dialogButtons">
                <DB name={'cancel'}
                    onClick={this.props.closeCallback}
                >Cancel</DB>
                <DB name={'ok'}
                    onClick={this.save}>Ok</DB>
            </div>
        </div>
    }

}


const showEditDialog=(handlerId,child,opt_doneCallback)=>{
    EditHandlerDialog.createDialog(handlerId,child,opt_doneCallback);
}
const statusTextToImageUrl=(text)=>{
    let rt=globalStore.getData(keys.properties.statusIcons[text]);
    if (! rt) rt=globalStore.getData(keys.properties.statusIcons.INACTIVE);
    return rt;
};
const EditIcon=(props)=>{
    return <Button
        name="Edit" className="Edit smallButton editIcon" onClick={props.onClick}/>

}
const ChildStatus=(props)=>{
    let canEdit=props.canEdit && props.connected;
    return (
        <div className="childStatus">
            <img src={statusTextToImageUrl(props.status)}/>
            <span className="statusName">{props.name}</span>
            <span className="statusInfo">{props.info}</span>
            {canEdit && <EditIcon onClick={
                ()=>showEditDialog(props.handlerId,props.id,props.finishCallback)
            }/>}
        </div>
    );
};
const StatusItem=(props)=>{
    let canEdit=props.canEdit && props.connected && props.allowEdit;
    let isDisabled=props.disabled;
    let name=props.name.replace(/\[.*\]/, '');
    if (props.id !== undefined){
        name="["+props.id+"]"+name;
    }
    return(
        <div className="status"  key={props.id}>
            <div className={"statusHeading"+ (isDisabled?" disabled":"")}>
                <span className="statusName">{name}</span>
                {isDisabled && <span className="disabledInfo">[disabled]</span> }
                {canEdit && <EditIcon
                    onClick={
                        () => showEditDialog(props.id,undefined,props.finishCallback)
                    }/>}
            </div>
            {props.info && props.info.items && props.info.items.map(function(el){
                return <ChildStatus
                    {...el}
                    key={props.name+el.name}
                    connected={props.connected}
                    handlerId={props.id}
                    finishCallback={props.finishCallback}
                />
            })}
        </div>

    );
};

class StatusList extends React.Component{
    constructor(props) {
        super(props);
        this.querySequence=1;
        this.doQuery=this.doQuery.bind(this);
        this.queryResult=this.queryResult.bind(this);
        this.errors=0;
        this.timer=GuiHelpers.lifecycleTimer(this,this.doQuery,globalStore.getData(keys.properties.statusQueryTimeout),true);
        this.mainListRef=null;
        this.state={
            itemList:[]
        }
        this.defaultProps={
            addresses:false,
            wpa:false,
            shutdown:false,
            serverError:false
        };
        if (this.props.reloadNotifier){
            this.props.reloadNotifier.register(()=>this.retriggerQuery())
        }
    }
    componentWillUnmount() {
        if (this.props.reloadNotifier) this.props.reloadNotifier.register(undefined);
    }

    queryResult(data){
        let self=this;
        let itemList=[];
        let storeData=assign({},this.defaultProps);
        self.errors=0;
        if (data.handler) {
            data.handler.forEach(function(el){
                if (el.properties && el.properties.addresses ) storeData.addresses=true;
                if (el.configname === "AVNWpaHandler"){
                    storeData.wpa=true;
                }
                if (el.configname==="AVNCommandHandler"){
                    if (el.properties && el.properties.shutdown ) storeData.shutdown=true;
                }
                el.key=el.displayKey||el.id;
                itemList.push(el);
            });
        }
        if (this.props.onChange){
            this.props.onChange(storeData);
        }
        this.setState({itemList:itemList});

    }
    retriggerQuery(){
        this.timer.stopTimer();
        this.doQuery();
    }
    doQuery(sequence){
        let self=this;
        Requests.getJson("?request=status",{checkOk:false}).then(
            (json)=>{
                self.timer.guardedCall(sequence,()=> {
                    self.queryResult(json)
                    self.timer.startTimer(sequence);
                });
            },
            (error)=>{
                this.timer.guardedCall(sequence,()=> {
                    self.errors++;
                    if (self.errors > 4) {
                        let newState = {itemList: []};
                        newState.serverError = true;
                        if (this.props.onChange) {
                            this.props.onChange({serverError: true});
                        }
                        this.setState(newState);
                    }
                    self.timer.startTimer(sequence);
                });
            });
    }
    getSnapshotBeforeUpdate(prevProps, prevState) {
        if (!this.mainListRef) return null;
        return{
            x:this.mainListRef.scrollLeft,
            y:this.mainListRef.scrollTop
        }
    }
    componentDidUpdate(prevProps, prevState, snapshot) {
        if (snapshot && this.mainListRef){
            this.mainListRef.scrollLeft=snapshot.x;
            this.mainListRef.scrollTop=snapshot.y;
        }
    }
    render(){
        return <ItemList
            itemClass={(iprops)=><StatusItem
                connected={this.props.connected}
                allowEdit={this.props.allowEdit}
                finishCallback={
                    ()=>{
                        this.retriggerQuery();
                    }
                }
                {...iprops}/>}
            itemList={this.state.itemList}
            scrollable={true}
            listRef={(ref)=>this.mainListRef=ref}
        />
    }

}

StatusList.propTypes={
    onChange: PropTypes.func,
    connected: PropTypes.bool,
    allowEdit: PropTypes.bool,
    reloadNotifier: PropTypes.instanceOf(Notifier)
}

class StatusPage extends React.Component{
    constructor(props){
        super(props);
        let self=this;
        this.state={
            addresses:false,
            wpa:false,
            shutdown:false,
            serverError:false,
            canRestart:false
        }
        this.reloadNotifier=new Notifier();
    }
    componentDidMount(){
        if (! globalStore.getData(keys.gui.capabilities.config)) return;
        Requests.getJson('',undefined,{
            request:'api',
            type:'config',
            command:'canRestart'
        })
            .then((data)=>{
                this.setState({canRestart:data.canRestart});
            })
            .catch((e)=>Toast(e))
    }
    componentWillUnmount(){
    }
    restartServer(){
        OverlayDialog.confirm("really restart the AvNav server software?")
            .then((v)=>{
                Requests.getJson('',undefined,{
                    request:'api',
                    type:'config',
                    command:'restartServer'
                })
                    .then(()=>Toast("restart triggered"))
                    .catch((e)=>Toast(e))
            })
            .catch((e)=>{})
    }
    render(){
        let self=this;

        let Rt=Dynamic((props)=>{
            let buttons=[
                {
                    name:'StatusWpa',
                    visible: this.state.wpa && props.connected,
                    onClick:()=>{this.props.history.push('wpapage');}
                },
                {
                    name:'StatusAddresses',
                    visible:this.state.addresses,
                    onClick:()=>{this.props.history.push("addresspage");}
                },
                {
                    name:'StatusAndroid',
                    visible: props.android,
                    onClick:()=>{avnav.android.showSettings();}
                },
                {
                    name:'AndroidBrowser',
                    visible: props.android && this.state.addresses,
                    onClick:()=>{avnav.android.launchBrowser();}
                },

                {
                    name: 'MainInfo',
                    onClick: ()=> {
                        this.props.history.push('infopage')
                    },
                    overflow:true
                },
                {
                    name: 'StatusShutdown',
                    visible: !props.android && this.state.shutdown && props.connected,
                    onClick:()=>{
                        OverlayDialog.confirm("really shutdown the server computer?").then(function(){
                            Requests.getJson("?request=command&start=shutdown").then(
                                (json)=>{
                                    Toast("shutdown started");
                                },
                                (error)=>{
                                    OverlayDialog.alert("unable to trigger shutdown: "+error);
                                });

                        })
                            .catch(()=>{});
                    }
                },
                {
                    name:'StatusRestart',
                    visible: this.state.canRestart && props.connected,
                    onClick: ()=>this.restartServer()
                },
                {
                    name: 'StatusLog',
                    visible: props.log,
                    onClick: ()=>{
                        OverlayDialog.dialog((props)=>{
                            return <LogDialog
                                {...props}
                                baseUrl={globalStore.getData(keys.properties.navUrl)+"?request=download&type=config"}
                                title={'AvNav Log'}
                            />
                        });
                    },
                    overflow: true
                },
                {
                    name: 'StatusDebug',
                    visible: props.debugLevel && props.connected,
                    onClick: ()=>{
                        OverlayDialog.dialog(DebugDialog);
                    },
                    overflow: true
                },
                {
                    name: 'StatusAdd',
                    visible: props.config && props.connected,
                    onClick: ()=>{
                        EditHandlerDialog.createAddDialog(()=>this.reloadNotifier.trigger());
                    }
                },
                Mob.mobDefinition(this.props.history),
                {
                    name: 'Cancel',
                    onClick: ()=>{this.props.history.pop()}
                }
            ];

            let className=props.className;
            if (this.state.serverError) className+=" serverError";
            let pageProperties=Helper.filteredAssign(Page.pageProperties,this.props);
            return(
            <Page
                {...pageProperties}
                className={className}
                id="statuspage"
                title={this.state.serverError?"Server Connection lost":"Server Status"}
                mainContent={
                    <StatusList
                        connected={props.connected}
                        allowEdit={props.config}
                        onChange={(nv)=>window.setTimeout(()=>this.setState((state,props)=>{
                            let comp=Helper.filteredAssign(nv,state);
                            if (Compare(nv,comp)) return null;
                            return nv;
                        }),1)}
                        reloadNotifier={this.reloadNotifier}
                    />
                }
                buttonList={buttons}/>
            )},{
            storeKeys:{
                connected:keys.properties.connectedMode,
                android:keys.gui.global.onAndroid,
                config: keys.gui.capabilities.config,
                log: keys.gui.capabilities.log,
                debugLevel: keys.gui.capabilities.debugLevel
            }
        });
        return <Rt/>
    }
}

export default StatusPage;