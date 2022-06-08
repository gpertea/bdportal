/* eslint-disable no-lonely-if */
import { h } from 'preact';
import $ from 'jquery';
import {useEffect, useState, useRef, useReducer} from "preact/hooks";
import '../../comp/ui.css';
import './style.css';

import {useFltCtx, useFltCtxUpdate, useRData, getFilterData, getFilterSet, getFilterCond,
	applyFilterSet, applyFilterCond, applyBrList, clearBrListFilter,
	getBrListFilter, clearFilters, dtFilters} from '../../comp/RDataCtx'

import {FltMList} from '../../comp/FltMList'
import {Row, Col, Button, Label, Input, CustomInput} from 'reactstrap'

import RSelSummary from '../../comp/RSelSummary'
import AgeDualPanel from '../../comp/AgeDualPanel'

import {useMxSel, MxSelProvider} from './mxSelCtx'
import RMatrix from './RMatrix'

//import { MW_SERVER } from '../../appcfg'
//import axios from 'axios'
import {saveRStagedFile} from '../../comp/gutils.js'

// the top-right info panel- show numeric summary of filters?
//items is an array of text lines to show
// the top-right info panel
// items is an array of text lines to show
function TrPanel( ) {
const [fltUpdId, fltFlip] = useFltCtx(); //external update, should update this component
//
const [selcol, selregs, mxvals, dtxs] = useMxSel(); //when Matrix regions are clicked this gets updated
let nhregs=0; //number of hilighted regions (not necessarily applied!)
let clist='';
const regions=[];
const regc=[];
let expType='';
const refData = useRef({
    regSelApplied: false,
		showHint:false,
		expType:''
})
const m=refData.current
if (selcol>0) { // selcol-1 : experiment type

 expType=['RNASeq', 'DNAm', 'WGS', 'scRNAseq', 'long RNAseq' ][selcol-1];
	for (let i=0;i<selregs.length; i++) {
		if (selregs[i])
			nhregs++;
	}
}
if (nhregs && dtFilters.reg.size>0) m.regSelApplied=true
m.showHint = (nhregs && !m.regSelApplied)
m.expType=expType

 function bSaveClick() {
    console.log("Save button clicked")
    const fname='rse_test.rda'
    saveRStagedFile(fname)
 }

 useEffect( ()=>{
       if (m.showHint) {
			   $('#regSelInfo').toast('show')
			 }
	 } )
 return (<Row className="m-0 p-0 ml-3 mr-2 trinfo justify-content-center align-items-center red-info-text"
 style="width:20rem;min-height:4rem;">
  {/* <Button id="bsave" className="btn-sm app-btn" onClick={bSaveClick}>Save</Button>&nbsp; */}
	<div class="position-fixed p-1" style="z-index: 15; top: 4em; right: 12em;">
  <div id="regSelInfo" class="toast hide" role="alert" aria-live="assertive" aria-atomic="true" data-delay="2000">
    <div class="toast-header-sm">
      {/* <img src="..." class="rounded mr-2" alt="..." /> */}
      <strong class="mr-auto" style="color:#777;">Information</strong>
      {/* <small>11 mins ago</small> */}
      <button type="button" class="ml-2 mb-1 mr-1 close" data-dismiss="toast" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <div class="toast-body mt-1 pt-0">
		  Only subjects having {m.expType} samples in the <br /> selected brain regions
			will be considered after selection is applied
    </div>
  </div>
 </div></Row>)

/*
return (<Row className="m-0 p-0 ml-3 mr-2 trinfo justify-content-center align-items-center red-info-text"
		 style="width:20rem;min-height:4rem;">
{showHint ? <> Only subjects having {expType} samples in the <br /> selected brain regions
			will be considered
</> : null}

</Row>)
*/
}

const BrMatrix = ({  tab, style }) => {
//if (tab!=='exp' && tab!=='rep') tab='sel'
const [, , , dataLoaded] = useRData()
const notifyUpdate = useFltCtxUpdate();
//const [brloaded, setBrLoaded] = useState(0)

const [, forceUpdate] = useReducer((x) => x + 1, 0);
//const [ageRangeState, setAgeRangeState]=useState([0,16,62]); // [ageRangeEnabled, agemin, agemax]
//console.log(" BrMatrix dataLoaded status: ", dataLoaded)

useEffect( ()=>{
	$('[data-toggle="tooltip"]').tooltip({ delay:{show:800, hide:100 }, trigger : 'hover'})
	//$("body").tooltip({ selector: '[data-toggle=tooltip]' });
	$('.toast').toast({ delay: 5000 })
}, [])


if (!dataLoaded) return <h3>Loading..</h3>

// data loaded, we are safe to show the pages for this data type
//changeXType(0); //update counts etc.
//rGlobs.rebuildRMatrix=true;

function resetFilters() {
  clearFilters()
  //forceUpdate()
  //setHideNoSeq(false)
  //setHideNoGeno(false)
  notifyUpdate('clear')
	//simply triggers refresh, but for some components we want to trigger remount
}

function onBrListLoad(brlist) {
	if (!brlist || brlist.length==0) {
		clearBrListFilter()
		notifyUpdate('clear-brlist')
		//setBrLoaded(0)
		return 0
	}
	const n=applyBrList(brlist)
	notifyUpdate('brlist')
	return n
}

function toggleOnlySeq(e) {
	let v=e.target.checked;
	applyFilterCond('with_seq', v)
	//setHideNoSeq(v); //
	notifyUpdate('sequenced');
}

function toggleOnlyGeno(e) {
let v=e.target.checked;
applyFilterCond('with_gt', v)
//setHideNoGeno(v); //
notifyUpdate('genotyped');
}

function applyFilter(fid) {
 applyFilterSet(fid)
 notifyUpdate(fid)
}

function onAgeSelection(customRange) {
  notifyUpdate(customRange?'age-range':'age')
}

//console.log(">>------------- rendering brmatrix page!")

const dtaSex=getFilterData('sex')
const dtaDx=getFilterData('dx')
const dtaRace=getFilterData('race')
const flt_onlySeq=getFilterCond('with_seq')
const flt_onlyGeno=getFilterCond('with_gt')
const brloaded=getBrListFilter().size

//console.log(" -- page render with flt_onlySeq=", flt_onlySeq);
return(<div class="col-12 d-flex flex-column">
<MxSelProvider>
<Row className="pl-2 pt-0 pb-0 mt-0 d-flex flex-nowrap align-items-end justify-content-center">
<Col xs="3" className="colDemo ml-2" style={{height:"3.3rem"}}> &nbsp;
	 <div class="col d-flex justify-content-between align-self-center ckRow">
		 <div class="col-6 d-flex">
			 <div class="row pl-0 d-flex justify-content-start align-self-center">
				 <Button outline color="danger" className="btn-sm align-self-start" onClick={resetFilters}
				   data-toggle="tooltip" title="Clear all demographic filters"
					 style="line-height:80%;font-size:80%;margin-top:-3px;">Clear</Button>
			 </div>
		 </div>
		 <div class="col-6 d-flex flex-column">
			 <div class="row mx-auto">
				 <div className="ckbox-label" data-toggle="tooltip" data-placement="left" title="Consider only genotyped brains" >
					 <CustomInput type="checkbox" id="ckOnlyGenotyped" onClick={toggleOnlyGeno} checked={flt_onlyGeno} />
					 Genotyped
				 </div>
			 </div>
			 <div class="row mx-auto">
				 <div className="ckbox-label" data-toggle="tooltip" data-placement="left" title="Only sequenced brains with at least one data type">
					 <CustomInput type="checkbox" id="ckOnlySeq" onClick={toggleOnlySeq} checked={flt_onlySeq} />
					 Sequenced
				 </div>
			 </div>
		</div>
	</div>
</Col>
<Col xs="5" className="colMatrix d-flex align-self-start">  </Col>
<Col xs="4" className="pl-3 colSummary align-self-start">
		<Row className="m-0 p-0 mr-1 pr-1 mt-1 d-flex justify-content-start">
				 <TrPanel />
		 </Row>
</Col>
</Row>
<Row className="flex-grow-1 pt-0 mt-0 justify-content-center">
	<Col xs="3" className="colDemo" >
	<Col className="d-flex flex-column col-vscroll"  >
	 <Row className="d-flex justify-content-start">
		 <FltMList id="dx" width="15em" height="6.9em" data={dtaDx} filter={getFilterSet} onApply={applyFilter} updateFilter />
	 </Row>
	 <Row className="d-flex justify-content-start">
				<FltMList id="sex" type="htoggle" width="15em" data={dtaSex} filter={getFilterSet} onApply={applyFilter} updateFilter />
	 </Row>
	 <AgeDualPanel width="15em" onAgeSelection={onAgeSelection} />
	 <Row className="d-flex justify-content-start">
		 <FltMList id="race" width="15em" height="5.4rem" data={dtaRace} filter={getFilterSet} onApply={applyFilter} updateFilter />
	 </Row>

	</Col>
 </Col>

 <Col xs="5" className="pt-0 mt-0 colMatrix align-self-start">
	 <Row className="mt-0 pt-0">
			 <Col className="col-4 matrixWrap">
				 <RMatrix />
			 </Col>
	 </Row>
 </Col>
 {/* <Col xs="4" className="colSummary d-flex pt-0 mt-0 justify-content-center align-items-start flex-grow-1 bpink">
	 {/* <Col className="d-flex pt-0 mt-0 flex-column col-vscroll align-items-stretch" > */}
	<Col xs="4" className="d-flex flex-fill" >
		 <Row className="pt-0 mt-0 d-flex flex-fill flex-grow-1 justify-content-center align-items-start">
		    <RSelSummary brloaded={brloaded} onBrList={onBrListLoad} />
		 </Row>
	 {/*</Col>*/}
 </Col>
</Row>
</MxSelProvider>
</div>)
}

export default BrMatrix;