var xmlStr = '<?xml version="1.0" encoding="UTF-8"?>\
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:omgdi="http://www.omg.org/spec/DD/20100524/DI" xmlns:omgdc="http://www.omg.org/spec/DD/20100524/DC" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="sid-38422fae-e03e-43a3-bef4-bd33b32041b2" targetNamespace="http://bpmn.io/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="6.4.1">\
  <process id="Process_1" isExecutable="false">\
    <startEvent id="StartEvent_001" name="hunger noticed">\
      <outgoing>SequenceFlow_001</outgoing>\
    </startEvent>\
    <task id="Task_001" name="choose recipe">\
      <incoming>SequenceFlow_001</incoming>\
      <outgoing>SequenceFlow_002</outgoing>\
    </task>\
    <sequenceFlow id="SequenceFlow_001" sourceRef="StartEvent_001" targetRef="Task_001" />\
    <exclusiveGateway id="ExclusiveGateway_001" name="desired dish?">\
      <incoming>SequenceFlow_002</incoming>\
    </exclusiveGateway>\
    <sequenceFlow id="SequenceFlow_002" sourceRef="Task_001" targetRef="ExclusiveGateway_001" />\
  </process>\
  <bpmndi:BPMNDiagram id="BpmnDiagram_1">\
    <bpmndi:BPMNPlane id="BpmnPlane_1" bpmnElement="Process_1">\
      <bpmndi:BPMNEdge id="SequenceFlow_002_di" bpmnElement="SequenceFlow_002">\
        <omgdi:waypoint x="340" y="120" />\
        <omgdi:waypoint x="395" y="120" />\
      </bpmndi:BPMNEdge>\
      <bpmndi:BPMNEdge id="SequenceFlow_001_di" bpmnElement="SequenceFlow_001">\
        <omgdi:waypoint x="188" y="120" />\
        <omgdi:waypoint x="240" y="120" />\
      </bpmndi:BPMNEdge>\
      <bpmndi:BPMNShape id="StartEvent_001_di" bpmnElement="StartEvent_001">\
        <omgdc:Bounds x="152" y="102" width="36" height="36" />\
        <bpmndi:BPMNLabel>\
          <omgdc:Bounds x="134" y="145" width="73" height="14" />\
        </bpmndi:BPMNLabel>\
      </bpmndi:BPMNShape>\
      <bpmndi:BPMNShape id="Task_001_di" bpmnElement="Task_001">\
        <omgdc:Bounds x="240" y="80" width="100" height="80" />\
      </bpmndi:BPMNShape>\
      <bpmndi:BPMNShape id="ExclusiveGateway_001_di" bpmnElement="ExclusiveGateway_001" isMarkerVisible="true">\
        <omgdc:Bounds x="395" y="95" width="50" height="50" />\
        <bpmndi:BPMNLabel>\
          <omgdc:Bounds x="388" y="152" width="65" height="14" />\
        </bpmndi:BPMNLabel>\
      </bpmndi:BPMNShape>\
    </bpmndi:BPMNPlane>\
  </bpmndi:BPMNDiagram>\
</definitions>';
