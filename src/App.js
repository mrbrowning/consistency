import React, { Component } from 'react';
import './App.css';
import {
  CONSISTENCY_LEVELS,
  READ_OP,
  WRITE_OP,
  CAS_OP,
  OPERATION_SYMBOLS,
  CLIENT_A_PID,
  CLIENT_B_PID,
  histories,
  relativisticHistories
} from './histories';

import * as d3 from 'd3';


const TIMELINE_HEIGHT = 100;
const TIMELINE_WIDTH = 798;
const TIMELINE_TEXT_HEIGHT = 75;
const OP_TEXT_HEIGHT = 15;
const ARROW_LENGTH = 5;

const GRAPH_SIZE = 300;
const NUM_LINES = 7;
const LINE_SPACING = GRAPH_SIZE / NUM_LINES;
const HANDLE_LOCATION = 3;
const EVENT_CIRCLE_WIDTH = 6;

const NULL_FUNC = function() {
  return;
}


class App extends Component {
  render() {
    const timelines = histories.map((h) =>
      <RegularTimeline width={TIMELINE_WIDTH} history={h} consistencyLevel={h.consistencyLevel} />
    );
    const relativisticTimelines = relativisticHistories.map((h) =>
      <RelativisticTimeline width={TIMELINE_WIDTH} history={h} consistencyLevel={h.consistencyLevel} />
    );

    return (
      <div className="App">
        {timelines}
        {relativisticTimelines}
      </div>
    );
  }
}


class RelativisticTimeline extends Component {
  constructor(props) {
    super(props);

    this.handleEventChange = this.handleEventChange.bind(this);
    this.state = {
      events: this.props.history.events
    };
  }

  handleEventChange(events) {
    this.setState({events: events});
  }

  render() {
    return (
      <div className="Timeline">
        <RelativityGraph events={this.props.history.events} onEventChange={this.handleEventChange} />
        <Timeline
          width={798}
          events={this.state.events}
          consistencyLevel={this.props.history.consistencyLevel}
          onEventChange={NULL_FUNC}
          canModify={false} />
      </div>
    );
  }
}


class RegularTimeline extends Component {

  constructor(props) {
    super(props);

    this.state = {
      events: this.props.history.events
    };
  }

  render() {
    return (
      <div className="Timeline">
        <Timeline
          width={798}
          events={this.props.history.events}
          consistencyLevel={this.props.history.consistencyLevel}
          onEventChange={NULL_FUNC}
          canModify={true} />
      </div>
    );
  }
}


class Timeline extends Component {
  constructor(props) {
    super(props);

    this.handleEventChange = this.handleEventChange.bind(this);
    this.handleConsistencyChange = this.handleConsistencyChange.bind(this);
    this.validators = {
      linearizable: this.isLinearizable.bind(this),
      sequential: this.isSequential.bind(this),
      serializable: this.isSerializable.bind(this),
    };


    this.state = {
      consistencyLevel: this.props.consistencyLevel,
      events: this.props.events,
    };
    this.state.storeValues = this.getStoreValues(this.props.events);
  }

  getEvents() {
    return this.props.canModify ? this.state.events : this.props.events;
  }

  getEventsBySystemTime() {
    return this.getEventsByField("systemTime");
  }

  getEventsBySendTime() {
    return this.getEventsByField("clientSend");
  }

  getEventsByAckTime() {
    return this.getEventsByField("clientAck");
  }

  getEventsByField(field) {
    return this.getEvents().concat().sort((e1, e2) => e1[field] > e2[field] ? 1 : -1);
  }

  getStoreValues() {
    const eventsBySystemTime = this.getEventsBySystemTime();
    const values = [];
    let currentValue = 0;

    for (let i = 0; i < eventsBySystemTime.length; i++) {
      const event = eventsBySystemTime[i];

      values.push(currentValue);
      if (event.clientOperation === WRITE_OP) {
        currentValue = event.opValue;
      } else if (event.clientOperation === CAS_OP) {
        currentValue = event.opValue[1];
      }
    }

    return values;
  }

  isLinearizable() {
    const eventsBySystemTime = this.getEventsBySystemTime();
    const storeValues = this.getStoreValues();

    return eventsBySystemTime
      .map((e, i) => (
        (e.clientOperation === WRITE_OP && e.systemTime <= e.clientAck) ||
        (e.clientOperation === READ_OP && e.opValue === storeValues[i]) ||
        (e.clientOperation === CAS_OP && e.opValue[0] === storeValues[i] && e.systemTime <= e.clientAck)
      ))
      .every((x) => x);
  }

  isSequential() {
    for (let i = 0; i < 2; i++) {
      const pidEvents = this.getEvents().filter((e) => e.clientPid === i);
      const eventsBySystemTime = pidEvents.sort((e1, e2) => e1.systemTime > e2.systemTime ? 1 : -1);
      const eventsBySendTime = pidEvents.concat().sort((e1, e2) => e1.clientSend > e2.clientSend ? 1 : -1);

      if (eventsBySystemTime.map((e, i) => e.id !== eventsBySendTime[i].id).some((b) => b)) {
        return false;
      }
    }

    return true;
  }

  isSerializable() {
    const eventsBySystemTime = this.getEventsBySystemTime();
    const storeValues = this.getStoreValues();

    return !eventsBySystemTime
      .map((e, i) => e.clientOperation === CAS_OP && e.opValue[0] !== storeValues[i])
      .some((x) => x);
  }

  doesOverlap(location, otherLocation) {
    return (
      (location > otherLocation && location < otherLocation + 10) ||
      (location + 10 > otherLocation && location < otherLocation)
    );
  }

  eventTimeToLocation(eventTime) {
    return eventTime / 100.0 * this.props.width;
  }

  locationToEventTime(location) {
    return location * 100.0 / this.props.width;
  }

  handleConsistencyChange(consistencyLevel) {
    this.setState({consistencyLevel: consistencyLevel});
  }

  handleEventChange(index, indicatedLocation) {
    const event = this.getEvents()[index];
    if (event.clientOperation === READ_OP && this.locationToEventTime(indicatedLocation) > event.clientAck) {
      indicatedLocation = this.eventTimeToLocation(event.clientAck);
    }
    if ((event.clientOperation === WRITE_OP || event.clientOperation === CAS_OP) &&
        this.locationToEventTime(indicatedLocation) < event.clientSend) {
      indicatedLocation = this.eventTimeToLocation(event.clientSend);
    }

    const eventLocation = this.eventTimeToLocation(event.systemTime);
    const overlap = this.getEvents().map((e) => this.eventTimeToLocation(e.systemTime)).filter(
      (e, i) => (i !== index && this.doesOverlap(indicatedLocation, e))
    )[0];

    if (typeof overlap !== "undefined" && ((eventLocation === overlap - 10) || (eventLocation === overlap + 10))) {
      // This is the case where we've already "jumped" the selected event over the other (see comment below). Even
      // though the indicated location overlaps another event, we'll just wait until the mouse isn't over the overlapped
      // event anymore so that the event being dragged doesn't jump around spuriously.
      return;
    }

    const overlapDirection = event.systemTime - indicatedLocation;
    if (typeof overlap !== "undefined") {
      // We don't want to let the user put one event over the other, so jump to the other side of the overlapped event
      // in the direction that the mouse is moving.
      if (overlapDirection >= 0) {
        indicatedLocation = overlap - 10;
      } else {
        indicatedLocation = overlap + 10;
      }
    }

    if (indicatedLocation < 2 || indicatedLocation > this.props.width - 10) {
      return;
    }

    const updatedEvents = this.getEvents();
    updatedEvents[index].systemTime = this.locationToEventTime(indicatedLocation);

    this.setState({events: updatedEvents});
    this.props.onEventChange(updatedEvents);
  }

  render() {
    const events = this.getEvents().map(
      (e, i) =>
        <SystemEvent
          key={e.id}
          index={e.id}
          operation={e.clientOperation}
          opValue={e.opValue}
          clientPid={e.clientPid} 
          clientSend={e.clientSend} clientAck={e.clientAck}
          location={this.eventTimeToLocation(e.systemTime)}
          timelineWidth={this.props.width}
          onTimeChange={this.handleEventChange}
          canModify={this.props.canModify} />
    );

    const isValid = this.validators[this.state.consistencyLevel]();
    const notification = (
      <text
          x="10" y={105 + ARROW_LENGTH + TIMELINE_HEIGHT / 2 + TIMELINE_TEXT_HEIGHT / 4}
          style={{font: "italic " + TIMELINE_TEXT_HEIGHT + "px futura", fontWeight: "bold", pointerEvents: "none"}}
          fill="#fff">
        Not {this.state.consistencyLevel.charAt(0).toUpperCase() + this.state.consistencyLevel.slice(1)}!
      </text>
    );
    const svgHeight = TIMELINE_HEIGHT + 200 + (OP_TEXT_HEIGHT + ARROW_LENGTH + 7) * 2;

    return (
      <div>
        <svg
          width="800px"
          height={svgHeight + "px"}
          viewBox={"0 -" + (OP_TEXT_HEIGHT + ARROW_LENGTH + 7) + " 800 " + svgHeight}
          xmlns="http://www.w3.org/2000/svg"
          version="1.1">
        <defs>
          <linearGradient id="timelineGradient">
            <stop offset="0%" stopColor="#5e59ac" />
            <stop offset="50%" stopColor="#9972d0" />
            <stop offset="100%" stopColor="#28bad7" />
          </linearGradient>
          <linearGradient id="invalidGradient">
            <stop offset="0%" stopColor="#ff1c1c" />
            <stop offset="50%" stopColor="#ff6868" />
            <stop offset="100%" stopColor="#eb6311" />
          </linearGradient>
        </defs>
        <desc>An event history</desc>
        <rect
          x="1"
          y="100"
          width={this.props.width}
          height={TIMELINE_HEIGHT}
          rx="10"
          fill={isValid ? "url(#timelineGradient)" : "#d00"}
          stroke="#000"
          strokeWidth="2" />
        {events}
        {isValid ? "" : notification}
        </svg>
        <EventTable events={this.getEventsBySystemTime()} canModify={this.props.canModify} />
        <ModelSelector
          consistencyLevel={this.state.consistencyLevel}
          onConsistencyLevelChange={this.handleConsistencyChange} />
      </div>
    );
  }
}


class EventTable extends Component {

  render() {
    const header = (
      <thead>
        <tr>
          <th>id</th>
          <th>operation</th>
          <th>value</th>
        </tr>
      </thead>
    );
    const rows = this.props.events.map((e) => (
      <tr>
        <td>{e.id}</td>
        <td>{e.clientOperation}</td>
        <td>{e.clientOperation === CAS_OP ? "(" + e.opValue[0] + ", " + e.opValue[1] + ")" : e.opValue}</td>
      </tr>
    ));

    return (
      <table>
        {header}
        <tbody>{rows}</tbody>
      </table>
    );
  }
}


class ModelSelector extends Component {

  constructor(props) {
    super(props);

    this.onChange = this.onChange.bind(this);
  }

  onChange(e) {
    this.props.onConsistencyLevelChange(e.target.value);
  }

  render() {
    const options = CONSISTENCY_LEVELS.map((c) => <option key={c} value={c}>{c}</option>);

    return (
      <div className="ModelSelector">
        Consistency level:&nbsp;
        <select defaultValue={this.props.consistencyLevel} onChange={this.onChange}>
          {options}
        </select>
      </div>
    );
  }
}


class SystemEvent extends Component {

  constructor(props) {
    super(props);

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    this.state = this.getInitialState();
  }

  getInitialState() {
    return {
      isDragging: false,
      mouseOffset: 0,
    };
  }

  onMouseDown(e) {
    if (e.button !== 0) {
      return;
    }

    this.setState({
      isDragging: true,
      mouseOffset: e.pageX - this.props.location,
    });
  }

  onMouseMove(e) {
    if (!this.state.isDragging) {
      return;
    }

    this.props.onTimeChange(this.props.index, e.pageX - this.state.mouseOffset);

    e.stopPropagation();
    e.preventDefault();
  }

  onMouseUp(e) {
    this.setState({isDragging: false, color: "#000000"});

    e.stopPropagation();
    e.preventDefault();
  }

  color() {
    return this.state.isDragging ? "#eba311" : "#000000";
  }

  componentDidUpdate(_, prevState) {
    if (this.state.isDragging && !prevState.isDragging) {
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    } else if (!this.state.isDragging && prevState.isDragging) {
      // Bizarrely, re-binding these methods seems to be required for the runtime to recognize them as the same
      // reference as was added.
      document.removeEventListener('mousemove', this.onMouseMove.bind(this));
      document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  getControlPointY(isFirstControlPoint, xPosition) {
    if (this.props.location === 0) {
      // log(0) is undefined, so just return the limit here (see comment below).
      if (this.props.clientPid === CLIENT_A_PID && isFirstControlPoint) {
        return 10.0;
      } else if (this.props.clientPid === CLIENT_A_PID) {
        return 90.0;
      } else if (this.props.clientPid === CLIENT_B_PID && isFirstControlPoint) {
        return 190.0 + TIMELINE_HEIGHT;
      } else {
        return 110.0 + TIMELINE_HEIGHT;
      }
    }

    const isClientB = this.props.clientPid === CLIENT_B_PID;
    // The y-distance from top to bottom points of the event lines is 100, so position the two control points on the
    // Bezier curves relative to the middle.
    const referencePoint = isClientB ? 150.0 + TIMELINE_HEIGHT : 50.0;
    // The Bezier curves look weird if the control points remain at the same y-location no matter how long they are, so
    // make them closer to the line's endpoints when it's shorter (so that the line looks straighter and doesn't have a
    // sharp elbow at the middle) and farther when it's longer (so that the line produces a more graceful curve). Also,
    // rather than moving the control points linearly with respect to how far they are from their initial point, move
    // move them on a log scale, since the weirdness of the elbow in the middle drops off pretty quickly with how long
    // the line actually is.
    const maxDistanceFromEdge = Math.max(this.props.location, this.props.timelineWidth - this.props.location);
    const scaleValue = (
      (isClientB ? -1.0 : 1.0) *
      40.0 *
      (1.0 - Math.log(Math.abs(xPosition - this.props.location)) / Math.log(maxDistanceFromEdge))
    );

    if (isFirstControlPoint) {
      return referencePoint - scaleValue;
    }

    return referencePoint + scaleValue;
  }

  scaleClientEventTime(eventTime) {
    return eventTime / 100.0 * (this.props.timelineWidth - 4.0) + 5.0;
  }

  render() {
    const pidSign = this.props.clientPid === CLIENT_A_PID ? 1 : -1;
    const sendLineX = this.scaleClientEventTime(this.props.clientSend) + 1;
    const ackLineX = this.scaleClientEventTime(this.props.clientAck);

    const eventLineStartY = this.props.clientPid === CLIENT_A_PID ? 0 : 200 + TIMELINE_HEIGHT;
    const eventLineEndY = this.props.clientPid === CLIENT_A_PID ? 101 : 99 + TIMELINE_HEIGHT;

    const sendLineControlPoint1Y = this.getControlPointY(true, sendLineX);
    const sendLineControlPoint2Y = this.getControlPointY(false, sendLineX);
    const ackLineControlPoint1Y = this.getControlPointY(true, ackLineX);
    const ackLineControlPoint2Y = this.getControlPointY(false, ackLineX);

    const clientSendLine = d3.line().curve(d3.curveBasis)([
      [sendLineX, eventLineStartY],
      [sendLineX, sendLineControlPoint1Y],
      [this.props.location + 5, sendLineControlPoint2Y],
      [this.props.location + 5, eventLineEndY]
    ]);
    const clientSendArrow = d3.line()([
        [sendLineX - ARROW_LENGTH, eventLineStartY - ARROW_LENGTH * pidSign],
        [sendLineX, eventLineStartY],
        [sendLineX + ARROW_LENGTH, eventLineStartY - ARROW_LENGTH * pidSign]
    ]);
    const clientAckLine = d3.line().curve(d3.curveBasis)(
      [
        [ackLineX, eventLineStartY - ARROW_LENGTH * pidSign],
        [ackLineX, ackLineControlPoint1Y],
        [this.props.location + 5, ackLineControlPoint2Y],
        [this.props.location + 5, eventLineEndY]
      ]
    );
    const clientAckArrow = d3.line()([
      [ackLineX - ARROW_LENGTH, eventLineStartY],
      [ackLineX, eventLineStartY - ARROW_LENGTH * pidSign],
      [ackLineX + ARROW_LENGTH, eventLineStartY]
    ]);

    const textFudgeFactor = pidSign < 0 ? 12 : 3;
    const opValueText = (
      this.props.operation === CAS_OP ? this.props.opValue[0] + ", " + this.props.opValue[1] : this.props.opValue
    );
    const sendText = (
      <text
        x={sendLineX - ARROW_LENGTH}
        y={eventLineStartY - (OP_TEXT_HEIGHT / 2 + textFudgeFactor) * pidSign}
        style={{font: "bold " + OP_TEXT_HEIGHT + "px helvetica", pointerEvents: "none"}}
        fill={this.color()}>{OPERATION_SYMBOLS[this.props.operation]}({opValueText})</text>
    );
    const ackText = (
      <text
        x={ackLineX - ARROW_LENGTH}
        y={eventLineStartY - (OP_TEXT_HEIGHT / 2 + textFudgeFactor) * pidSign}
        style={{font: OP_TEXT_HEIGHT + "px helvetica", pointerEvents: "none"}}
        fill={this.color()}>{OPERATION_SYMBOLS[this.props.operation]}'({opValueText})</text>
    );

    return (
      <React.Fragment>
        <path style={{display: 'inline', stroke: this.color(), strokeWidth: 2, fill: "none"}} d={clientSendLine} />
        <path style={{display: 'inline', stroke: this.color(), strokeWidth: 2, fill: "none"}} d={clientSendArrow} />
        <path style={{display: 'inline', stroke: this.color(), strokeWidth: 2, fill: "none"}} d={clientAckLine} />
        <path style={{display: 'inline', stroke: this.color(), strokeWidth: 2, fill: "none"}} d={clientAckArrow} />
        {sendText}
        {ackText}
        <rect
          x={this.props.location}
          y="101"
          width="10"
          height={TIMELINE_HEIGHT - 2}
          fill={this.color()}
          stroke="none"
          onMouseDown={this.props.canModify ? this.onMouseDown : NULL_FUNC}>
        </rect>
      </React.Fragment>
    );
  }
}


class RelativityGraph extends Component {

  constructor(props) {
    super(props);

    this.handleOrderChange = this.handleOrderChange.bind(this);
    this.state = {
      scaledEvents: props.events,
      velocity: 0
    }
  }

  handleOrderChange(events, stretchFactor) {
    const isContraction = stretchFactor < 1;
    const sign = isContraction ? -1 : 1;
    const lorentzFactor = (
      isContraction ? Math.max(stretchFactor, 0) : -2.2727 * Math.min(stretchFactor, Math.sqrt(2)) + 3.223
    );
    const velocity = sign * Math.sqrt(1 - lorentzFactor * lorentzFactor);

    this.setState({scaledEvents: events, velocity: velocity});
    this.props.onEventChange(events);
  }

  getBackgroundRect(x, y, w, h) {
    return <rect x={x} y={y} width={w} height={h} stroke="none" className="backgroundRect" />;
  }

  getAxisArrow(x, y) {
    return (
      <React.Fragment>
        <path
          strokeWidth="2px"
          stroke="#000"
          fill="none"
          d={d3.line()([[x - ARROW_LENGTH, y - ARROW_LENGTH - 2], [x, y - 1]])} />
        <path
          strokeWidth="2px"
          stroke="#000"
          fill="none"
          d={d3.line()([[x - ARROW_LENGTH, y + ARROW_LENGTH], [x, y]])} />
      </React.Fragment>
    )
  }

  getTick(x, y) {
    return <path strokeWidth="2px" stroke="#000" fill="none" d={d3.line()([[x - 5, y], [x, y]])} />;
  }

  getText(x, y, text, isBold) {
    const style = {font: OP_TEXT_HEIGHT + "px helvetica", pointerEvents: "none"};
    if (isBold) {
      style.fontWeight = "bold";
    }

    return <text x={x} y={y} style={style} fill="#000">{text}</text>;
  }

  render() {
    const width = GRAPH_SIZE * 2 + 100;
    return (
      <div className="RelativityGraph">
        <svg
            width={width + 40}
            height={GRAPH_SIZE + (OP_TEXT_HEIGHT + 5) * 4}
            viewBox={
              "-20 -" + (OP_TEXT_HEIGHT + 20) + " " + (width + 20) + " " + (GRAPH_SIZE + (OP_TEXT_HEIGHT + 5) * 3)
            }
            xmlns="http://www.w3.org/2000/svg"
            version="1.1">

          <CoordinateSystem
            xPosition={GRAPH_SIZE + 100}
            stretchFactor={1}
            color="#fff"
            isLeft={false}
            canModify={false}
            events={this.state.scaledEvents} />

          {this.getBackgroundRect(0, 1, GRAPH_SIZE, GRAPH_SIZE)}

          <CoordinateSystem
            xPosition={0}
            stretchFactor={1}
            color="#000"
            isLeft={true}
            canModify={false}
            events={[]}
            onChange={NULL_FUNC} />
          <CoordinateSystem
            xPosition={0}
            stretchFactor={1}
            color="#fff"
            isLeft={true}
            canModify={true}
            events={this.props.events}
            onChange={this.handleOrderChange} />

          <rect x="1" y="1" width={GRAPH_SIZE - 1} height={GRAPH_SIZE - 2} stroke="#000" strokeWidth="2" fill="none" />
          <rect
            x={GRAPH_SIZE + 100}
            y="1"
            width={GRAPH_SIZE - 1}
            height={GRAPH_SIZE - 2}
            stroke="#000"
            strokeWidth="2"
            fill="none" />

          {/* These are a bunch of hacks to create the illusion that the lines in the graph are bounded by its edges. */}
          {this.getBackgroundRect(GRAPH_SIZE + 1, 0, 98, GRAPH_SIZE)}
          {this.getBackgroundRect(0, -2 * (OP_TEXT_HEIGHT + 5), width, 2 * (OP_TEXT_HEIGHT + 5))}
          {this.getBackgroundRect(0, GRAPH_SIZE, width, GRAPH_SIZE)}
          {this.getBackgroundRect(-20, -OP_TEXT_HEIGHT - 20, 20, GRAPH_SIZE + 2 * (OP_TEXT_HEIGHT + 20))}
          {this.getBackgroundRect(-20, -2 * (OP_TEXT_HEIGHT + 30), width + 20, -2 * (OP_TEXT_HEIGHT + 5) + 25)}

          {this.getAxisArrow(GRAPH_SIZE, GRAPH_SIZE)}
          {this.getAxisArrow(GRAPH_SIZE * 2 + 99, GRAPH_SIZE)}

          {this.getTick(0, GRAPH_SIZE - LINE_SPACING)}
          {this.getTick(0, GRAPH_SIZE - (NUM_LINES - 1) * LINE_SPACING)}

          {this.getTick(GRAPH_SIZE + 99, GRAPH_SIZE - LINE_SPACING)}
          {this.getTick(GRAPH_SIZE + 99, GRAPH_SIZE - (NUM_LINES - 1) * LINE_SPACING)}

          {this.getText(GRAPH_SIZE - 35, GRAPH_SIZE + OP_TEXT_HEIGHT + 5, "Time")}
          {this.getText(GRAPH_SIZE * 2 + 64, GRAPH_SIZE + OP_TEXT_HEIGHT + 5, "Time")}

          {this.getText(-20, GRAPH_SIZE - LINE_SPACING + OP_TEXT_HEIGHT / 2 - 2, "A")}
          {this.getText(-20, GRAPH_SIZE - (LINE_SPACING * (NUM_LINES - 1)) + OP_TEXT_HEIGHT / 2 - 2, "B")}

          {this.getText(GRAPH_SIZE + 80, GRAPH_SIZE - LINE_SPACING + OP_TEXT_HEIGHT / 2 - 2, "A")}
          {this.getText(GRAPH_SIZE + 80, GRAPH_SIZE - (LINE_SPACING * (NUM_LINES - 1)) + OP_TEXT_HEIGHT / 2 - 2, "B")}

          {this.getText(0, -5, "Default Reference Frame", true)}
          {this.getText(GRAPH_SIZE + 100, -5, "Moving Reference Frame", true)}

          <text 
              x={GRAPH_SIZE * 2 + 10}
              y="-5" style={{font: "12px monaco", pointerEvents: "none"}}
              fill="#000">
            {"v = " + (this.state.velocity >= 0 ? "+" : "") + this.state.velocity.toFixed(4) + "c"}
          </text>
        </svg>
      </div>
    );
  }
}


class CoordinateSystem extends Component {

  constructor(props) {
    super(props);

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.getScaledSystemTime = this.getScaledSystemTime.bind(this);
    this.color = this.color.bind(this);

    this.state = {
      isDragging: false,
      mouseOffsetX: 0,
      mouseOffsetY: 0,
      stretchFactor: props.stretchFactor,
      stretchFactorAtClick: 1
    };
  }

  getBasis(stretchFactor) {
    if (stretchFactor * stretchFactor >= 2) {
      const coordinate = Math.sqrt(1 / 2);

      return [[coordinate, coordinate], [coordinate, coordinate]];
    }

    const factor = Math.sqrt((1 - stretchFactor * stretchFactor / 2) / 2)
    const iX = stretchFactor / 2 + factor;
    const iY = stretchFactor / 2 - factor;

    return [[iX, iY], [iY, iX]];
  }

  onMouseDown(e) {
    if (e.button !== 0) {
      return;
    }

    this.setState({
      isDragging: true,
      mouseOffsetX: e.pageX,
      mouseOffsetY: e.pageY,
      stretchFactorAtClick: this.state.stretchFactor
    });
  }

  onMouseMove(e) {
    if (!this.state.isDragging) {
      return;
    }

    this.handleBasisChange(e.pageX - this.state.mouseOffsetX, e.pageY - this.state.mouseOffsetY);

    e.stopPropagation();
    e.preventDefault();
  }

  onMouseUp(e) {
    this.setState({isDragging: false});

    e.stopPropagation();
    e.preventDefault();
  }

  handleBasisChange(handleX, handleY) {
    const graphSize = LINE_SPACING * HANDLE_LOCATION;
    const projection = (handleX - handleY) / 2;
    const newStretchFactor = (projection + graphSize * this.state.stretchFactorAtClick) / graphSize;

    if (newStretchFactor < 0) {
      return;
    }

    const self = this;
    const scaledEvents = this.props.events.map(function (e) {
      const event = Object.assign({}, e);
      const translatedX = self.translateX(e, newStretchFactor);
      event.systemTime = translatedX / GRAPH_SIZE * 100.0;
      return event;
    });
    this.props.onChange(scaledEvents, newStretchFactor);

    this.setState({stretchFactor: newStretchFactor})
  }

  componentDidUpdate(_, prevState) {
    if (this.state.isDragging && !prevState.isDragging) {
      document.addEventListener('mousemove', this.onMouseMove);
      document.addEventListener('mouseup', this.onMouseUp);
    } else if (!this.state.isDragging && prevState.isDragging) {
      // Bizarrely, re-binding these methods seems to be required for the runtime to recognize them as the same
      // reference as was added.
      document.removeEventListener('mousemove', this.onMouseMove.bind(this));
      document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  getScaledSystemTime(systemTime) {
    return systemTime / 100.0 * GRAPH_SIZE;
  }

  getDottedLineStart(endPoint, newStretchFactor) {
    const [x, y] = endPoint;
    const stretchFactor = newStretchFactor || this.state.stretchFactor;
    const [I, J] = this.getBasis(stretchFactor);

    if (J[0] === 0) {
      return [x, 0];
    }

    const slope = J[1] / J[0];
    const offset = y - slope * x;

    const iSlope = I[1] / I[0];
    if (slope === iSlope) {
      return [x, y];
    }
    const startX = Math.max(0, Math.min(300, offset / (iSlope - slope)));

    return [startX, slope * startX + offset];
  }

  truncate(startPoint, endPoint) {
    const [sx, sy] = startPoint;
    const [ex, ey] = endPoint;
    if (sx === ex) {
      return [[sx, 0], [sx, GRAPH_SIZE]];
    } else if (sy === ey) {
      return [[0, sy], [GRAPH_SIZE, sy]];
    }

    const slope = (ey - sy) / (ex - sx);
    const offset = sy - slope * sx;

    const truncatedSx = sx < 0 ? 0 : (sx > GRAPH_SIZE ? GRAPH_SIZE : sx);
    const truncatedSy = slope * truncatedSx + offset;
    const truncatedEx = ex < 0 ? 0 : (ex > GRAPH_SIZE ? GRAPH_SIZE : ex);
    const truncatedEy = slope * truncatedEx + offset;

    return [[truncatedSx, truncatedSy], [truncatedEx, truncatedEy]];
  }

  translateX(e, newStretchFactor) {
    const [tX, tY] = this.getDottedLineStart(
      [this.getScaledSystemTime(e.systemTime), this.getEventYLocation(e)], newStretchFactor
    );

    return Math.sqrt(tX * tX + tY * tY) * tX / Math.abs(tX);
  }

  getEventYLocation(e) {
    return GRAPH_SIZE - (e.clientPid === CLIENT_A_PID ? NUM_LINES - 1 : 1) * LINE_SPACING;
  }

  color() {
    return this.state.isDragging ? "#eba311" : "#000";
  }

  getPath(points) {
    return (
      <path
        style={{strokeDasharray: 4, stroke: this.props.canModify ? "#fff" : "#000", strokeWidth: 2, fill: "none"}}
        d={d3.line()(points)} />
    );
  }

  render() {
    const [I, J] = this.getBasis(this.state.stretchFactor);
    const xLine = I.map((a) => a * LINE_SPACING * NUM_LINES);
    const [cx, cy] = I.map((a) => a * LINE_SPACING * 3);
    const gridLines = [];

    const self = this;
    const eventLocations = this.props.events.map(function (e) {
      const end = [self.getScaledSystemTime(e.systemTime), self.getEventYLocation(e)];
      const start = self.getDottedLineStart(end);
      const line = [start, end].map((p) => [p[0] + self.props.xPosition, GRAPH_SIZE - p[1]]);

      return (
        <React.Fragment>
          {self.getPath(line)}
          <circle
            cx={line[1][0]}
            cy={line[1][1]}
            r={EVENT_CIRCLE_WIDTH}
            fill="#f00" />
        </React.Fragment>
      );
    });
   
    for (let i = 0; i <= NUM_LINES; i++) {
      const startPointXLine = J.map((a) => a * i * LINE_SPACING);
      const endPointXLine = startPointXLine.map((a, i) => (a + xLine[i]));

      [startPointXLine, endPointXLine] = this.truncate(startPointXLine, endPointXLine);
      const xlineString = d3.line()(
        [startPointXLine, endPointXLine].map((p) => [p[0] + self.props.xPosition, GRAPH_SIZE - p[1]])
      );

      const [startPointYLine, endPointYLine] = [startPointXLine, endPointXLine].map(
        (p) => [p[1] + self.props.xPosition, p[0]]
      ); 
      [startPointYLine, endPointYLine] = this.truncate(startPointYLine, endPointYLine);
      const ylineString = d3.line()([startPointYLine, endPointYLine].map((p) => [p[0], GRAPH_SIZE - p[1]]));

      gridLines.push(
        <path style={{display: 'inline', stroke: this.props.color, strokeWidth: 2, fill: "none"}} d={xlineString} />
      );
      gridLines.push(
        <path style={{display: 'inline', stroke: this.props.color, strokeWidth: 2, fill: "none"}} d={ylineString} />
      );
    }
    return (
      <React.Fragment>
        {gridLines}
        {eventLocations}
        {this.props.canModify ?
          <circle
            cx={cx + cy + this.props.xPosition}
            cy={GRAPH_SIZE - cx - cy}
            r="20"
            fill={this.color()}
            onMouseDown={this.onMouseDown} /> : ""}
      </React.Fragment>
    );
  }
}

export default App;
