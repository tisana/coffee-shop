import { CopyPlus, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import type { CustomizationGroupInput } from "@coffee-shop/shared/contracts/api";

import { type CustomizationTemplate } from "./MenuItemEditor";
import { CustomizationGroupEditor } from "./CustomizationGroupEditor";

const NEW_TEMPLATE_ID = "__new_customization_template__";

interface CustomizationTemplateManagerProps {
  templates: CustomizationTemplate[];
  onTemplatesChange: (templates: CustomizationTemplate[]) => void;
  onMessage: (message: string) => void;
}

function copyTemplateGroups(groups: CustomizationGroupInput[]): CustomizationGroupInput[] {
  return groups.map((group, groupIndex) => ({
    name: group.name,
    required: group.required ?? false,
    minSelections: group.minSelections ?? 0,
    maxSelections: group.maxSelections ?? 1,
    displayOrder: group.displayOrder ?? groupIndex + 1,
    active: group.active ?? true,
    choices: group.choices?.map((choice, choiceIndex) => ({
      name: choice.name,
      priceAdjustment: choice.priceAdjustment ?? "0.00",
      available: choice.available ?? true,
      displayOrder: choice.displayOrder ?? choiceIndex + 1,
      active: choice.active ?? true
    }))
  }));
}

function createBlankTemplate(): CustomizationTemplate {
  return {
    id: NEW_TEMPLATE_ID,
    label: "",
    groups: []
  };
}

function createStoredTemplateId() {
  return `custom-template:${Date.now()}`;
}

export function CustomizationTemplateManager({
  templates,
  onTemplatesChange,
  onMessage
}: CustomizationTemplateManagerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? NEW_TEMPLATE_ID);
  const [draftTemplate, setDraftTemplate] = useState<CustomizationTemplate>(
    templates[0] ? { ...templates[0], groups: copyTemplateGroups(templates[0].groups) } : createBlankTemplate()
  );

  useEffect(() => {
    if (selectedTemplateId === NEW_TEMPLATE_ID) {
      return;
    }

    const selectedTemplate = templates.find((template) => template.id === selectedTemplateId);
    if (selectedTemplate) {
      setDraftTemplate({
        ...selectedTemplate,
        groups: copyTemplateGroups(selectedTemplate.groups)
      });
      return;
    }

    const fallbackTemplate = templates[0];
    setSelectedTemplateId(fallbackTemplate?.id ?? NEW_TEMPLATE_ID);
    setDraftTemplate(
      fallbackTemplate
        ? { ...fallbackTemplate, groups: copyTemplateGroups(fallbackTemplate.groups) }
        : createBlankTemplate()
    );
  }, [selectedTemplateId, templates]);

  function selectTemplate(template: CustomizationTemplate) {
    setSelectedTemplateId(template.id);
    setDraftTemplate({
      ...template,
      groups: copyTemplateGroups(template.groups)
    });
  }

  function addTemplate() {
    setSelectedTemplateId(NEW_TEMPLATE_ID);
    setDraftTemplate(createBlankTemplate());
  }

  function saveTemplate() {
    const label = draftTemplate.label.trim() || "Untitled template";
    const savedTemplate = {
      id: draftTemplate.id === NEW_TEMPLATE_ID ? createStoredTemplateId() : draftTemplate.id,
      label,
      groups: copyTemplateGroups(draftTemplate.groups)
    };
    const nextTemplates =
      draftTemplate.id === NEW_TEMPLATE_ID
        ? [...templates, savedTemplate]
        : templates.map((template) => (template.id === draftTemplate.id ? savedTemplate : template));

    onTemplatesChange(nextTemplates);
    setSelectedTemplateId(savedTemplate.id);
    setDraftTemplate(savedTemplate);
    onMessage(`${savedTemplate.label} template saved.`);
  }

  function deleteTemplate() {
    if (draftTemplate.id === NEW_TEMPLATE_ID) {
      return;
    }

    const nextTemplates = templates.filter((template) => template.id !== draftTemplate.id);
    const nextSelection = nextTemplates[0];

    onTemplatesChange(nextTemplates);
    setSelectedTemplateId(nextSelection?.id ?? NEW_TEMPLATE_ID);
    setDraftTemplate(
      nextSelection
        ? { ...nextSelection, groups: copyTemplateGroups(nextSelection.groups) }
        : createBlankTemplate()
    );
    onMessage(`${draftTemplate.label || "Customization"} template deleted.`);
  }

  return (
    <section className="customization-template-manager" aria-label="Customization templates">
      <header className="customization-template-header">
        <h3>Customization templates</h3>
      </header>

      <section className="menu-maintenance-list" aria-label="Customization template list">
        <button type="button" className="add-menu-item-button" onClick={addTemplate}>
          <Plus size={17} aria-hidden="true" />
          Add template
        </button>

        <div className="menu-maintenance-category">
          <h3>Reusable templates</h3>
          <div>
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={
                  selectedTemplateId === template.id
                    ? "menu-maintenance-row selected"
                    : "menu-maintenance-row"
                }
                onClick={() => selectTemplate(template)}
              >
                <CopyPlus size={16} aria-hidden="true" />
                <span>Edit {template.label}</span>
                <small>{template.groups.length} groups</small>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="menu-item-editor" aria-label={`${draftTemplate.label || "New template"} template editor`}>
        <div className="menu-editor-title">
          <div>
            <p className="eyebrow">Reusable setup</p>
            <h3>{draftTemplate.label || "New template"}</h3>
          </div>
        </div>

        <label>
          Template name
          <input
            value={draftTemplate.label}
            onChange={(event) =>
              setDraftTemplate((current) => ({ ...current, label: event.target.value }))
            }
          />
        </label>

        <CustomizationGroupEditor
          groups={draftTemplate.groups}
          onChange={(groups) => setDraftTemplate((current) => ({ ...current, groups }))}
        />

        <div className="menu-editor-actions">
          <button type="button" onClick={saveTemplate}>
            <Save size={17} aria-hidden="true" />
            Save template
          </button>
          <button
            type="button"
            className="secondary-danger-button"
            disabled={draftTemplate.id === NEW_TEMPLATE_ID}
            onClick={deleteTemplate}
          >
            <Trash2 size={17} aria-hidden="true" />
            Delete template
          </button>
        </div>
      </section>
    </section>
  );
}
