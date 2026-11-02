import { LitElement, html, css } from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

// --- РЕДАКТОР КАРТОЧКИ ---
class CustomTopologyEnergyCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
    };
  }

  setConfig(config) {
    this.config = config;
  }

  configChanged(newConfig) {
    const event = new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  static get styles() {
    return css`
      .editor-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 8px;
        color: var(--primary-text-color);
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
      }
      .input-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      label {
        font-weight: 500;
        font-size: 14px;
        color: var(--secondary-text-color);
      }
      input, textarea {
        background: var(--secondary-background-color);
        color: var(--primary-text-color);
        border: 1px solid var(--divider-color);
        border-radius: 4px;
        padding: 8px;
        font-family: inherit;
        font-size: 14px;
      }
      textarea {
        resize: vertical;
        font-family: monospace;
      }
    `;
  }

  render() {
    if (!this.config || !this.hass) {
      return html``;
    }

    const title = this.config.title || "";
    const nodesString = JSON.stringify(this.config.nodes || [], null, 2);
    const connectionsString = JSON.stringify(this.config.connections || [], null, 2);

    return html`
      <div class="editor-container">
        <div class="input-group">
          <label for="title">Заголовок карточки</label>
          <input
            id="title"
            .value="${title}"
            @input="${this._titleChanged}"
            type="text"
          />
        </div>

        <div class="input-group">
          <label for="nodes">Узлы (Nodes в формате JSON)</label>
          <textarea
            id="nodes"
            .value="${nodesString}"
            @input="${this._nodesChanged}"
            rows="8"
          ></textarea>
        </div>

        <div class="input-group">
          <label for="connections">Связи (Connections в формате JSON)</label>
          <textarea
            id="connections"
            .value="${connectionsString}"
            @input="${this._connectionsChanged}"
            rows="6"
          ></textarea>
        </div>
      </div>
    `;
  }

  _titleChanged(ev) {
    if (!this.config) return;
    this.configChanged({ ...this.config, title: ev.target.value });
  }

  _nodesChanged(ev) {
    if (!this.config) return;
    try {
      const parsedNodes = JSON.parse(ev.target.value);
      this.configChanged({ ...this.config, nodes: parsedNodes });
    } catch (e) {}
  }

  _connectionsChanged(ev) {
    if (!this.config) return;
    try {
      const parsedConnections = JSON.parse(ev.target.value);
      this.configChanged({ ...this.config, connections: parsedConnections });
    } catch (e) {}
  }
}

customElements.define("custom-topology-energy-card-editor", CustomTopologyEnergyCardEditor);


// --- ОСНОВНАЯ КАРТОЧКА ---
class CustomTopologyEnergyCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
    };
  }

  setConfig(config) {
    if (!config.nodes || !config.connections) {
      throw new Error("Необходимо указать узлы (nodes) и связи (connections)");
    }
    this.config = config;
  }

  static getConfigElement() {
    return document.createElement("custom-topology-energy-card-editor");
  }

  static getStubConfig() {
    return {
      title: "Моя энергосистема",
      nodes: [
        { id: "grid", name: "Сеть", entity: "sensor.grid_power", icon: "mdi:transmission-tower", x: 50, y: 100 },
        { id: "home", name: "Дом", entity: "sensor.home_power", icon: "mdi:home", x: 250, y: 100 }
      ],
      connections: [
        { from: "grid", to: "home", color: "#3498db" }
      ]
    };
  }

  static get styles() {
    return css`
      .card {
        background: var(--card-background-color, #1c1c1c);
        padding: 16px;
        border-radius: var(--ha-card-border-radius, 12px);
        color: var(--primary-text-color, #fff);
        font-family: var(--paper-font-body1_-_font-family, sans-serif);
      }
      .canvas-container {
        position: relative;
        width: 100%;
        height: 320px;
      }
      .node {
        position: absolute;
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
      }
      .icon-circle {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--secondary-background-color, #2d2d2d);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        border: 2px solid var(--accent-color, #03a9f4);
        transition: transform 0.2s, border-color 0.2s;
      }
      .icon-circle:hover {
        transform: scale(1.08);
        border-color: var(--primary-color, #03a9f4);
      }
      .node-label {
        font-size: 11px;
        margin-top: 6px;
        color: var(--secondary-text-color, #aaa);
        text-align: center;
        max-width: 90px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .node-value {
        font-size: 12px;
        font-weight: bold;
      }
      svg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
      path {
        fill: none;
        stroke-width: 4;
        opacity: 0.65;
        stroke-linecap: round;
      }
    `;
  }

  render() {
    if (!this.hass || !this.config) {
      return html``;
    }

    return html`
      <ha-card class="card">
        ${this.config.title ? html`<h3 style="margin-top:0; margin-bottom: 12px;">${this.config.title}</h3>` : ''}
        <div class="canvas-container">
          <svg>
            ${this.config.connections.map(conn => {
              const fromNode = this.config.nodes.find(n => n.id === conn.from);
              const toNode = this.config.nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return html``;
              
              const pathData = `M ${fromNode.x} ${fromNode.y} C ${fromNode.x + 60} ${fromNode.y}, ${toNode.x - 60} ${toNode.y}, ${toNode.x} ${toNode.y}`;
              return html`<path d="${pathData}" stroke="${conn.color || 'var(--accent-color)'}" />`;
            })}
          </svg>

          ${this.config.nodes.map(node => {
            const stateObj = node.entity ? this.hass.states[node.entity] : null;
            const stateValue = stateObj ? stateObj.state : "---";
            const unit = stateObj?.attributes?.unit_of_measurement || "W";

            return html`
              <div class="node" style="left: ${node.x}px; top: ${node.y}px; transform: translate(-50%, -50%);" @click="${() => this._handleEntityClick(node.entity)}">
                <div class="icon-circle">
                  <ha-icon icon="${node.icon || 'mdi:flash'}"></ha-icon>
                </div>
                <div class="node-label">${node.name}</div>
                <div class="node-value">${stateValue} ${unit}</div>
              </div>
            `;
          })}
        </div>
      </ha-card>
    `;
  }

  _handleEntityClick(entityId) {
    if (!entityId) return;
    const event = new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true,
    });
    this.shadowRoot.dispatchEvent(event);
  }
}

customElements.define("custom-topology-energy-card", CustomTopologyEnergyCard);