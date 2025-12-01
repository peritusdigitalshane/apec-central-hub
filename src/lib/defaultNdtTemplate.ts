export interface TemplateBlockInsert {
  template_id: string;
  type: string;
  content: any;
  order_index: number;
}

export const createDefaultNdtTemplateBlocks = (
  templateId: string
): TemplateBlockInsert[] => {
  return [
    {
      template_id: templateId,
      type: "heading",
      content: {
        text: "FLUORESCENT MAGNETIC PARTICLE AND ULTRASONIC INSPECTION REPORT",
        level: 1,
      },
      order_index: 0,
    },
    {
      template_id: templateId,
      type: "data_table",
      content: {
        title: "Job & Client Details",
        rows: [
          { label: "Job No", value: "" },
          { label: "Client", value: "" },
          { label: "Contact", value: "" },
          { label: "Location", value: "" },
          { label: "Subject", value: "" },
          { label: "Report No", value: "" },
          { label: "Test Date", value: "" },
          { label: "Order No", value: "" },
          { label: "Report Date", value: "" },
          { label: "Technician", value: "" },
        ],
      },
      order_index: 1,
    },
    {
      template_id: templateId,
      type: "data_table",
      content: {
        title: "Technical Data Ultrasonic Inspection",
        rows: [
          { label: "Test Specification", value: "" },
          { label: "Probe", value: "" },
          { label: "Acceptance Standard", value: "" },
          { label: "Surface Condition", value: "" },
          { label: "Range", value: "" },
          { label: "Material Specification", value: "" },
          { label: "Couplant", value: "" },
          { label: "Sensitivity", value: "" },
          { label: "Sizing", value: "" },
          { label: "APEC Test Procedure", value: "" },
          { label: "Test Restrictions", value: "" },
          { label: "Flaw Detector", value: "" },
          { label: "Probe S/N", value: "" },
          { label: "Equipment Performance Before Tests", value: "" },
          { label: "Probe Index", value: "" },
          { label: "Beam Angle", value: "" },
          { label: "Beam Alignment", value: "" },
          { label: "Overall System Gain", value: "" },
        ],
      },
      order_index: 2,
    },
    {
      template_id: templateId,
      type: "data_table",
      content: {
        title: "Technical Data Magnetic Particle Inspection",
        rows: [
          { label: "Test Specification", value: "" },
          { label: "Material", value: "" },
          { label: "Acceptance Standard", value: "" },
          { label: "Surface Condition", value: "" },
          { label: "Black Light", value: "" },
          { label: "Media", value: "" },
          { label: "APEC Test Procedure", value: "" },
          { label: "Test Method", value: "" },
          { label: "Demagnetised", value: "" },
          { label: "Test Restrictions", value: "" },
          { label: "Magnetising Unit", value: "" },
          { label: "Lighting", value: "" },
        ],
      },
      order_index: 3,
    },
    {
      template_id: templateId,
      type: "notes",
      content: {
        title: "Examination Notes",
        text: "",
      },
      order_index: 4,
    },
    {
      template_id: templateId,
      type: "data_table",
      content: {
        title: "Examination Summary",
        rows: [
          { label: "Extent of testing", value: "" },
          { label: "Magnetic Particle Results", value: "" },
          { label: "Ultrasonic Results", value: "" },
        ],
      },
      order_index: 5,
    },
    {
      template_id: templateId,
      type: "photo_upload",
      content: {
        photos: [],
      },
      order_index: 6,
    },
    {
      template_id: templateId,
      type: "notes",
      content: {
        title: "Additional Observations",
        text: "",
      },
      order_index: 7,
    },
    {
      template_id: templateId,
      type: "text",
      content: {
        text: "Overall Result: ACCEPT  REJECT  ACCEPT WITH REPAIR\n\nSummary:\n\nRecommendations:",
      },
      order_index: 8,
    },
    {
      template_id: templateId,
      type: "data_table",
      content: {
        title: "Inspector Certification",
        rows: [
          { label: "Inspector Name", value: "" },
          { label: "Qualification/Certification Level", value: "" },
          { label: "Certificate Number", value: "" },
          { label: "Signature", value: "" },
          { label: "Date", value: "" },
        ],
      },
      order_index: 9,
    },
    {
      template_id: templateId,
      type: "data_table",
      content: {
        title: "Review & Approval",
        rows: [
          { label: "Reviewed By", value: "" },
          { label: "Position", value: "" },
          { label: "Signature", value: "" },
          { label: "Date", value: "" },
        ],
      },
      order_index: 10,
    },
  ];
};
