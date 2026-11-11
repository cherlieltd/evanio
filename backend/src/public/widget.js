(function () {
  "use strict";

  var script =
    document.currentScript ||
    document.querySelector('script[src*="widget.js"][data-key]');
  if (!script) return;

  var publicKey = script.getAttribute("data-key");
  if (!publicKey) return;

  var apiBase = script.src.replace(/\/widget\.js(\?.*)?$/, "");
  var storageKey = "evanio_widget_visitor_" + publicKey;
  var visitorId = localStorage.getItem(storageKey);
  if (!visitorId) {
    visitorId =
      "v_" +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);
    localStorage.setItem(storageKey, visitorId);
  }

  var sessionId = null;
  var open = false;
  var sending = false;
  var config = {
    welcomeMessage: "Hi! Ask me anything about our business.",
    primaryColor: "#047857",
    businessName: "Chat",
  };

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (key) {
        if (key === "style" && typeof attrs[key] === "object") {
          Object.assign(node.style, attrs[key]);
        } else if (key === "text") {
          node.textContent = attrs[key];
        } else if (key.slice(0, 2) === "on") {
          node.addEventListener(key.slice(2).toLowerCase(), attrs[key]);
        } else {
          node.setAttribute(key, attrs[key]);
        }
      });
    }
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function api(path, body) {
    return fetch(apiBase + path, {
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }).then(function (res) {
      return res.json().then(function (payload) {
        if (!res.ok) {
          throw new Error(
            (payload && payload.error) || "Request failed",
          );
        }
        return payload;
      });
    });
  }

  var root = el("div", {
    id: "evanio-chat-root",
    style: {
      position: "fixed",
      right: "20px",
      bottom: "20px",
      zIndex: "2147483000",
      fontFamily:
        'Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    },
  });

  var bubble = el("button", {
    type: "button",
    "aria-label": "Open chat",
    style: {
      width: "56px",
      height: "56px",
      borderRadius: "999px",
      border: "none",
      cursor: "pointer",
      color: "#fff",
      background: config.primaryColor,
      boxShadow: "0 10px 30px rgba(15,23,42,.25)",
      fontSize: "22px",
      fontWeight: "700",
    },
    text: "💬",
    onClick: function () {
      open = !open;
      panel.style.display = open ? "flex" : "none";
      bubble.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    },
  });

  var panel = el("div", {
    style: {
      display: "none",
      flexDirection: "column",
      width: "min(360px, calc(100vw - 32px))",
      height: "min(520px, calc(100vh - 100px))",
      marginBottom: "12px",
      borderRadius: "18px",
      overflow: "hidden",
      background: "#fff",
      boxShadow: "0 18px 50px rgba(15,23,42,.28)",
      border: "1px solid #e2e8f0",
    },
  });

  var header = el("div", {
    style: {
      padding: "14px 16px",
      color: "#fff",
      background: config.primaryColor,
      fontWeight: "700",
      fontSize: "15px",
    },
    text: "Chat",
  });

  var tabs = el("div", {
    style: {
      display: "flex",
      borderBottom: "1px solid #e2e8f0",
      background: "#f8fafc",
    },
  });

  var chatTab = el("button", {
    type: "button",
    style: tabStyle(true),
    text: "Chat",
    onClick: function () {
      showTab("chat");
    },
  });
  var leadTab = el("button", {
    type: "button",
    style: tabStyle(false),
    text: "Contact",
    onClick: function () {
      showTab("lead");
    },
  });
  tabs.appendChild(chatTab);
  tabs.appendChild(leadTab);

  function tabStyle(active) {
    return {
      flex: "1",
      border: "none",
      background: "transparent",
      padding: "10px",
      cursor: "pointer",
      fontWeight: active ? "700" : "500",
      color: active ? "#0f172a" : "#64748b",
      borderBottom: active ? "2px solid " + config.primaryColor : "2px solid transparent",
    };
  }

  var messages = el("div", {
    style: {
      flex: "1",
      overflowY: "auto",
      padding: "14px",
      background: "#f8fafc",
    },
  });

  var composer = el("form", {
    style: {
      display: "flex",
      gap: "8px",
      padding: "12px",
      borderTop: "1px solid #e2e8f0",
      background: "#fff",
    },
  });

  var input = el("input", {
    type: "text",
    placeholder: "Ask a question…",
    style: {
      flex: "1",
      border: "1px solid #cbd5e1",
      borderRadius: "10px",
      padding: "10px 12px",
      fontSize: "14px",
      outline: "none",
    },
  });

  var sendBtn = el("button", {
    type: "submit",
    style: {
      border: "none",
      borderRadius: "10px",
      padding: "0 14px",
      background: config.primaryColor,
      color: "#fff",
      fontWeight: "600",
      cursor: "pointer",
    },
    text: "Send",
  });

  composer.appendChild(input);
  composer.appendChild(sendBtn);

  var chatView = el("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minHeight: "0",
    },
  });
  chatView.appendChild(messages);
  chatView.appendChild(composer);

  var leadView = el("form", {
    style: {
      display: "none",
      flexDirection: "column",
      gap: "10px",
      padding: "14px",
      flex: "1",
      overflowY: "auto",
      background: "#fff",
    },
  });

  function field(labelText, name, type) {
    return el("label", { style: { display: "grid", gap: "4px", fontSize: "12px", color: "#475569" } }, [
      el("span", { text: labelText }),
      el("input", {
        name: name,
        type: type || "text",
        style: {
          border: "1px solid #cbd5e1",
          borderRadius: "10px",
          padding: "10px 12px",
          fontSize: "14px",
        },
      }),
    ]);
  }

  leadView.appendChild(field("Name", "name"));
  leadView.appendChild(field("Email", "email", "email"));
  leadView.appendChild(field("Phone", "phone", "tel"));
  leadView.appendChild(
    el("label", { style: { display: "grid", gap: "4px", fontSize: "12px", color: "#475569" } }, [
      el("span", { text: "Message" }),
      el("textarea", {
        name: "message",
        rows: "3",
        style: {
          border: "1px solid #cbd5e1",
          borderRadius: "10px",
          padding: "10px 12px",
          fontSize: "14px",
          resize: "vertical",
        },
      }),
    ]),
  );
  var leadStatus = el("div", {
    style: { fontSize: "12px", color: "#64748b", minHeight: "16px" },
  });
  leadView.appendChild(leadStatus);
  leadView.appendChild(
    el("button", {
      type: "submit",
      style: {
        border: "none",
        borderRadius: "10px",
        padding: "12px",
        background: config.primaryColor,
        color: "#fff",
        fontWeight: "600",
        cursor: "pointer",
      },
      text: "Send details",
    }),
  );

  var body = el("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      flex: "1",
      minHeight: "0",
    },
  });
  body.appendChild(tabs);
  body.appendChild(chatView);
  body.appendChild(leadView);

  panel.appendChild(header);
  panel.appendChild(body);
  root.appendChild(panel);
  root.appendChild(bubble);
  document.body.appendChild(root);

  function showTab(name) {
    var isChat = name === "chat";
    chatView.style.display = isChat ? "flex" : "none";
    leadView.style.display = isChat ? "none" : "flex";
    Object.assign(chatTab.style, tabStyle(isChat));
    Object.assign(leadTab.style, tabStyle(!isChat));
  }

  function addBubble(role, text) {
    var row = el("div", {
      style: {
        display: "flex",
        justifyContent: role === "user" ? "flex-end" : "flex-start",
        marginBottom: "8px",
      },
    });
    row.appendChild(
      el("div", {
        style: {
          maxWidth: "85%",
          padding: "10px 12px",
          borderRadius: "14px",
          fontSize: "14px",
          lineHeight: "1.4",
          whiteSpace: "pre-wrap",
          background: role === "user" ? config.primaryColor : "#fff",
          color: role === "user" ? "#fff" : "#0f172a",
          border: role === "user" ? "none" : "1px solid #e2e8f0",
        },
        text: text,
      }),
    );
    messages.appendChild(row);
    messages.scrollTop = messages.scrollHeight;
  }

  function applyTheme() {
    bubble.style.background = config.primaryColor;
    header.style.background = config.primaryColor;
    sendBtn.style.background = config.primaryColor;
    header.textContent = config.businessName || "Chat";
    Object.assign(chatTab.style, tabStyle(chatView.style.display !== "none"));
  }

  api("/public/widget/" + encodeURIComponent(publicKey) + "/config")
    .then(function (data) {
      config.welcomeMessage = data.welcomeMessage || config.welcomeMessage;
      config.primaryColor = data.primaryColor || config.primaryColor;
      config.businessName = data.businessName || config.businessName;
      applyTheme();
      addBubble("assistant", config.welcomeMessage);
    })
    .catch(function () {
      addBubble(
        "assistant",
        "Chat is unavailable right now. Leave your details in Contact.",
      );
    });

  composer.addEventListener("submit", function (event) {
    event.preventDefault();
    if (sending) return;
    var text = (input.value || "").trim();
    if (!text) return;
    input.value = "";
    addBubble("user", text);
    sending = true;
    sendBtn.disabled = true;

    api("/public/widget/" + encodeURIComponent(publicKey) + "/chat", {
      visitorId: visitorId,
      sessionId: sessionId || undefined,
      message: text,
    })
      .then(function (data) {
        sessionId = data.sessionId || sessionId;
        addBubble("assistant", data.reply);
      })
      .catch(function (err) {
        addBubble(
          "assistant",
          (err && err.message) ||
            "Sorry — I could not answer that. Try Contact so the team can follow up.",
        );
      })
      .finally(function () {
        sending = false;
        sendBtn.disabled = false;
        input.focus();
      });
  });

  leadView.addEventListener("submit", function (event) {
    event.preventDefault();
    var form = new FormData(leadView);
    var payload = {
      visitorId: visitorId,
      sessionId: sessionId || undefined,
      name: (form.get("name") || "").toString().trim() || undefined,
      email: (form.get("email") || "").toString().trim() || undefined,
      phone: (form.get("phone") || "").toString().trim() || undefined,
      message: (form.get("message") || "").toString().trim() || undefined,
    };

    leadStatus.textContent = "Sending…";
    api("/public/widget/" + encodeURIComponent(publicKey) + "/lead", payload)
      .then(function () {
        leadStatus.textContent = "Thanks — we received your details.";
        leadView.reset();
      })
      .catch(function (err) {
        leadStatus.textContent =
          (err && err.message) || "Could not send. Please try again.";
      });
  });
})();
