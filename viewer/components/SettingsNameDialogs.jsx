import React from 'react';
import PropTypes from 'prop-types';
import OverlayDialog, {dialogHelper} from './OverlayDialog.jsx';
import {Input, InputSelect} from './Inputs.jsx';
import DB from './DialogButton.jsx';
import assign from 'object-assign';
const nameToExternalName=(name,fixedPrefix)=>{
    if (fixedPrefix) return fixedPrefix+name;
    return name;
}
const externalNameToName=(name,fixedPrefix)=>{
    if (fixedPrefix){
        let l=fixedPrefix.length;
        if (name.substr(0,l) === fixedPrefix) return name.substr(l);
        return name;
    }
}
class SaveItemDialog extends React.Component{
    constructor(props){
        super(props);
        let value=externalNameToName(props.value);
        this.state=assign({
            value: value
            },
            props.checkFunction(nameToExternalName(value,this.props.fixedPrefix)));
        this.valueChanged=this.valueChanged.bind(this);
    }
    valueChanged(value) {
        let nstate=assign({value:value},this.props.checkFunction(nameToExternalName(value,this.props.fixedPrefix)));
        this.setState(nstate);
    }
    render () {
        let info="New ";
        if (this.state.active){
            info="Active ";
        }
        else{
            if (this.state.existing){
                info="Existing ";
            }
        }
        info+=this.props.itemLabel;
        return (
            <div className={this.props.className+" inner saveItemDialog"}>
                <h3 className="dialogTitle">{this.props.title||('Select '+this.props.itemLabel+' Name')}</h3>
                {this.props.subTitle?<p>{this.props.subTitle}</p>:null}
                <div>
                    <div className="dialogRow"><span className="wideLabel">{info}</span></div>
                    <div className="dialogRow">
                        <Input
                            className="saveName"
                            label={this.props.fixedPrefix||''}
                            value={this.state.value} onChange={this.valueChanged}/>
                    </div>
                </div>
                <div className="dialogButtons">
                    <DB name="cancel" onClick={this.props.closeCallback}>Cancel</DB>
                    <DB name="ok" onClick={() => {
                        this.props.okCallback(nameToExternalName(this.state.value,this.props.fixedPrefix));
                        this.props.closeCallback();
                        }}
                        disabled={this.state.existing && ! this.props.allowOverwrite}
                    >{(this.state.existing && this.props.allowOverwrite) ? "Overwrite" : "Ok"}</DB>
                </div>
            </div>
        );
    }
}

SaveItemDialog.propTypes={
    title: PropTypes.string,
    subTitle: PropTypes.string,
    className: PropTypes.string,
    fixedPrefix: PropTypes.string,
    checkFunction: PropTypes.func.isRequired, //return an object with existing, active
    itemLabel: PropTypes.string.isRequired,
    allowOverwrite: PropTypes.bool,
    value: PropTypes.string,
    okCallback: PropTypes.func.isRequired,
    closeCallback: PropTypes.func.isRequired
};
/**
 *
 * @param name
 * @param checkFunction
 * @param properties object with: title, itemLabel, subtitle, fixedPrefix
 * @return {*}
 */
SaveItemDialog.createDialog=(name,checkFunction,properties)=>{
    if (! properties) properties={}
    return new Promise((resolve,reject)=>{
        OverlayDialog.dialog((props)=> {
            return <SaveItemDialog
                {...properties}
                {...props}
                value={name}
                okCallback={(newName)=>{
                        resolve(newName)
                   }}
                checkFunction={(cname)=>{
                        if (checkFunction){
                            return checkFunction(cname);
                        }
                        return false;
                    }
                }
                />
        },undefined,()=>{reject("")});
    });
};

class LoadItemDialog extends React.Component{
    constructor(props){
        super(props);
        this.state={
                value: props.value
            };
        this.valueChanged=this.valueChanged.bind(this);
        this.dialog=dialogHelper(this);
    }
    valueChanged(value) {
        let nstate={value:value};
        this.setState(nstate);
    }
    render () {
        return (
            <div className={this.props.className+" inner loadItemDialog"}>
                <h3 className="dialogTitle">{this.props.title||('Select '+this.props.itemLabel)}</h3>
                {this.props.subTitle?<p>{this.props.subTitle}</p>:null}
                <div>
                    <div className="dialogRow">
                        <InputSelect
                            className="loadName"
                            label={this.props.itemLabel}
                            value={this.state.value}
                            itemList={this.props.itemList}
                            onChange={this.valueChanged}
                            changeOnlyValue={true}
                            showDialogFunction={this.dialog.showDialog}
                        />
                    </div>
                </div>
                <div className="dialogButtons">
                    <DB name="cancel" onClick={this.props.closeCallback}>Cancel</DB>
                    <DB name="ok" onClick={() => {
                        this.props.okCallback(this.state.value);
                        this.props.closeCallback();
                    }}>Ok</DB>
                </div>
            </div>
        );
    }
}

LoadItemDialog.propTypes={
    title: PropTypes.string,
    subTitle: PropTypes.string,
    className: PropTypes.string,
    itemLabel: PropTypes.string.isRequired,
    value: PropTypes.string,
    itemList: PropTypes.any.isRequired,
    okCallback: PropTypes.func.isRequired,
    closeCallback: PropTypes.func.isRequired
};

LoadItemDialog.createDialog=(name,itemList,properties)=>{
    if (! properties) properties={}
    return new Promise((resolve,reject)=>{
        OverlayDialog.dialog((props)=> {
            return <LoadItemDialog
                {...properties}
                {...props}
                value={name}
                okCallback={(newName)=>{
                    resolve(newName)
                }}
                itemList={itemList}
            />
        },undefined,()=>{reject("")});
    });
};

export {
    SaveItemDialog,
    LoadItemDialog
};