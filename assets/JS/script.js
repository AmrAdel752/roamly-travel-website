(function () {
  "use strict";

  const selectors = {
    toastRegion: "[data-toast-region]",
    favoritesCount: "[data-favorites-count]",
  };

  const state = {
    reduceMotion: Boolean(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    favoritesKey: "roamlyFavoriteDestinations",
  };

  function onReady(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
    } else {
      callback();
    }
  }

  function initOnce(element, key) {
    if (!element || element.dataset[key] === "true") {
      return false;
    }

    element.dataset[key] = "true";
    return true;
  }

  function getHashTarget(hash) {
    if (!hash || hash === "#") {
      return null;
    }

    try {
      return document.querySelector(hash);
    } catch (error) {
      return null;
    }
  }

  function scrollToTarget(target) {
    target.scrollIntoView({
      behavior: state.reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  function nextFrame(callback) {
    if ("requestAnimationFrame" in window) {
      window.requestAnimationFrame(callback);
    } else {
      window.setTimeout(callback, 0);
    }
  }

  function createToastRegion() {
    let region = document.querySelector(selectors.toastRegion);

    if (!region) {
      region = document.createElement("div");
      region.className = "site-toast-region";
      region.setAttribute("data-toast-region", "");
      region.setAttribute("aria-live", "polite");
      region.setAttribute("aria-atomic", "true");
      document.body.appendChild(region);
    }

    return region;
  }

  function showToast(options) {
    const region = createToastRegion();
    const toast = document.createElement("div");
    const iconElement = document.createElement("i");
    const messageElement = document.createElement("p");
    const close = document.createElement("button");
    const type = options.type === "error" ? "error" : "success";
    const icon =
      options.icon ||
      (type === "error" ? "fa-circle-exclamation" : "fa-compass");

    region.replaceChildren();
    toast.className = "site-toast" + (type === "error" ? " is-error" : "");
    toast.setAttribute("role", type === "error" ? "alert" : "status");

    iconElement.className = `fa-solid ${icon}`;
    iconElement.setAttribute("aria-hidden", "true");

    if (options.title) {
      const titleElement = document.createElement("strong");
      titleElement.textContent = options.title;
      messageElement.appendChild(titleElement);
    }

    messageElement.appendChild(document.createTextNode(options.message || ""));

    close.className = "toast-close";
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss message");
    close.textContent = "x";

    toast.append(iconElement, messageElement, close);
    region.appendChild(toast);

    const removeToast = function () {
      toast.remove();
    };

    close.addEventListener("click", removeToast, { once: true });
    window.setTimeout(removeToast, 5200);
  }

  function initNavigation() {
    const header = document.querySelector("[data-site-header]");
    const nav = document.querySelector("[data-primary-nav]");
    const toggle = document.querySelector("[data-nav-toggle]");

    if (!header || !nav || !toggle || !initOnce(header, "navigationReady")) {
      return;
    }

    const closeButton = document.querySelector("[data-nav-close]");
    const navLinks = document.querySelectorAll(
      '.primary-nav a[href^="#"], .header-actions a[href^="#"]',
    );
    const sectionLinks = document.querySelectorAll(
      '.primary-nav > .roamly-nav-link[href^="#"]',
    );
    const mobileNavQuery = window.matchMedia("(max-width: 899.98px)");

    function setNavHiddenState(isHidden) {
      if ("inert" in nav) {
        nav.inert = isHidden;
      }

      if (isHidden) {
        nav.setAttribute("aria-hidden", "true");
      } else {
        nav.removeAttribute("aria-hidden");
      }
    }

    function syncMenuAccessibility() {
      const isMobile = mobileNavQuery.matches;
      const isOpen = header.classList.contains("nav-open");

      setNavHiddenState(isMobile && !isOpen);
    }

    function setHeaderState() {
      header.classList.toggle("is-scrolled", window.scrollY > 16);
    }

    function closeMenu() {
      header.classList.remove("nav-open");
      document.body.classList.remove("nav-lock");
      toggle.setAttribute("aria-expanded", "false");
      syncMenuAccessibility();
    }

    function openMenu() {
      header.classList.add("nav-open");
      document.body.classList.add("nav-lock");
      toggle.setAttribute("aria-expanded", "true");
      syncMenuAccessibility();

      const firstMenuControl = nav.querySelector("button, a[href]");
      if (firstMenuControl) {
        firstMenuControl.focus();
      }
    }

    function getMenuFocusableElements() {
      return Array.from(
        header.querySelectorAll(
          'button, a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(function (element) {
        return !element.disabled && element.offsetParent !== null;
      });
    }

    function trapMenuFocus(event) {
      if (!header.classList.contains("nav-open") || event.key !== "Tab") {
        return;
      }

      const focusable = getMenuFocusableElements();

      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    function setActiveLink() {
      let activeLink = sectionLinks[0] || null;

      sectionLinks.forEach(function (link) {
        const section = getHashTarget(link.getAttribute("href"));

        if (section && section.getBoundingClientRect().top <= 140) {
          activeLink = link;
        }
      });

      sectionLinks.forEach(function (link) {
        const isActive = link === activeLink;
        link.classList.toggle("active", isActive);

        if (isActive) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    setHeaderState();
    setActiveLink();
    syncMenuAccessibility();

    window.addEventListener(
      "scroll",
      function () {
        setHeaderState();
        setActiveLink();
      },
      { passive: true },
    );

    toggle.addEventListener("click", function () {
      if (header.classList.contains("nav-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (closeButton) {
      closeButton.addEventListener("click", closeMenu);
    }

    navLinks.forEach(function (link) {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && header.classList.contains("nav-open")) {
        closeMenu();
        toggle.focus();
      }

      trapMenuFocus(event);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 900) {
        closeMenu();
      } else {
        syncMenuAccessibility();
      }
    });

    if (mobileNavQuery.addEventListener) {
      mobileNavQuery.addEventListener("change", syncMenuAccessibility);
    }
  }

  function initSmoothAnchors() {
    if (!initOnce(document.body, "smoothAnchorsReady")) {
      return;
    }

    document.addEventListener("click", function (event) {
      if (event.defaultPrevented) {
        return;
      }

      const link = event.target.closest('a[href^="#"]');

      if (!link) {
        return;
      }

      if (link.classList.contains("footer-back-top")) {
        return;
      }

      const target = getHashTarget(link.getAttribute("href"));

      if (!target) {
        return;
      }

      event.preventDefault();
      scrollToTarget(target);

      if (history.pushState) {
        history.pushState(null, "", link.getAttribute("href"));
      }
    });
  }

  function initSkipLink() {
    const skipLink = document.querySelector('.skip-link[href^="#"]');

    if (!skipLink || !initOnce(skipLink, "skipLinkReady")) {
      return;
    }

    skipLink.addEventListener("click", function (event) {
      const target = getHashTarget(skipLink.getAttribute("href"));

      if (!target) {
        return;
      }

      event.preventDefault();
      target.focus({ preventScroll: true });
      scrollToTarget(target);
    });
  }

  function readFavorites() {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem(state.favoritesKey) || "[]",
      );
      return Array.isArray(saved) ? saved.filter(Boolean) : [];
    } catch (error) {
      return [];
    }
  }

  function saveFavorites(favorites) {
    try {
      window.localStorage.setItem(
        state.favoritesKey,
        JSON.stringify(favorites),
      );
    } catch (error) {
      return [];
    }

    return favorites;
  }

  function updateFavoritesCount(favorites) {
    const count = favorites.length;

    document
      .querySelectorAll(selectors.favoritesCount)
      .forEach(function (counter) {
        counter.textContent = String(count);
        counter.hidden = count === 0;
      });
  }

  function initFavorites() {
    const destinationsSection = document.querySelector("[data-destinations]");
    let favorites = readFavorites();

    updateFavoritesCount(favorites);

    if (
      !destinationsSection ||
      !initOnce(destinationsSection, "favoritesReady")
    ) {
      return;
    }

    const favoriteButtons =
      destinationsSection.querySelectorAll("[data-favorite]");

    function setFavoriteButton(button, isFavorite) {
      const card = button.closest("[data-destination-id]");
      const title = card ? card.querySelector("h3") : null;
      const destination = title ? title.textContent.trim() : "destination";
      const icon = button.querySelector("i");

      button.classList.toggle("is-favorite", isFavorite);
      button.setAttribute("aria-pressed", String(isFavorite));
      button.setAttribute(
        "aria-label",
        `${isFavorite ? "Remove" : "Add"} ${destination} ${isFavorite ? "from" : "to"} favorites`,
      );

      if (icon) {
        icon.classList.toggle("fa-solid", isFavorite);
        icon.classList.toggle("fa-regular", !isFavorite);
      }
    }

    favoriteButtons.forEach(function (button) {
      const card = button.closest("[data-destination-id]");
      const id = card ? card.getAttribute("data-destination-id") : "";

      setFavoriteButton(button, favorites.includes(id));

      button.addEventListener("click", function () {
        if (!id) {
          return;
        }

        if (favorites.includes(id)) {
          favorites = favorites.filter(function (favoriteId) {
            return favoriteId !== id;
          });
        } else {
          favorites = favorites.concat(id);
        }

        favorites = saveFavorites(favorites);
        setFavoriteButton(button, favorites.includes(id));
        updateFavoritesCount(favorites);
      });
    });
  }

  function initDestinationFilters() {
    const section = document.querySelector("[data-destinations]");

    if (!section || !initOnce(section, "filtersReady")) {
      return;
    }

    const filters = Array.from(section.querySelectorAll("[data-filter]"));
    const cards = Array.from(section.querySelectorAll("[data-destination-id]"));

    if (!filters.length || !cards.length) {
      return;
    }

    function filterCards(category) {
      cards.forEach(function (card) {
        const categories = (card.getAttribute("data-category") || "").split(
          " ",
        );
        const shouldShow = category === "all" || categories.includes(category);

        card.classList.add("is-filtering");
        window.setTimeout(
          function () {
            card.classList.toggle("is-hidden", !shouldShow);
            nextFrame(function () {
              card.classList.remove("is-filtering");
            });
          },
          state.reduceMotion ? 0 : 120,
        );
      });
    }

    filters.forEach(function (filter) {
      filter.addEventListener("click", function () {
        const category = filter.getAttribute("data-filter") || "all";

        filters.forEach(function (button) {
          const isActive = button === filter;
          button.classList.toggle("active", isActive);
          button.setAttribute("aria-pressed", String(isActive));
        });

        filterCards(category);
      });
    });
  }

  function initTripPlanner() {
    const planner = document.querySelector("[data-trip-planner]");

    if (!planner || !initOnce(planner, "tripPlannerReady")) {
      return;
    }

    const form = planner.querySelector(".trip-planner-form");
    const destination = planner.querySelector("#destination");
    const checkIn = planner.querySelector("#inputCheckIn");
    const checkOut = planner.querySelector("#inputCheckOut");
    const destinationField = planner.querySelector(
      '[data-field="destination"]',
    );
    const checkOutField = planner.querySelector('[data-field="check-out"]');
    const destinationError = planner.querySelector("#destination-error");
    const checkoutError = planner.querySelector("#checkout-error");
    const travelers = planner.querySelector("[data-travelers]");
    const travelersToggle = planner.querySelector("[data-travelers-toggle]");
    const travelersSummary = planner.querySelector("[data-travelers-summary]");
    const travelersMenu = planner.querySelector("[data-travelers-menu]");
    const adultsInput = planner.querySelector("#adults");
    const childrenInput = planner.querySelector("#children");
    const submitButton = planner.querySelector(".planner-submit");

    if (
      !form ||
      !destination ||
      !checkIn ||
      !checkOut ||
      !travelers ||
      !travelersToggle ||
      !travelersSummary ||
      !travelersMenu ||
      !adultsInput ||
      !childrenInput
    ) {
      return;
    }

    const guestLimits = {
      adults: { min: 1, max: 8 },
      children: { min: 0, max: 6 },
    };
    const guests = {
      adults: Number(adultsInput.value) || 2,
      children: Number(childrenInput.value) || 0,
    };

    function setPlannerError(field, input, errorNode, message) {
      const hasError = Boolean(message);

      if (field) {
        field.classList.toggle("has-error", hasError);
      }

      if (input) {
        input.setAttribute("aria-invalid", String(hasError));
      }

      if (errorNode) {
        errorNode.textContent = message;
      }
    }

    function updateDateRules() {
      if (checkIn.value) {
        checkOut.min = checkIn.value;
      } else {
        checkOut.removeAttribute("min");
      }
    }

    function validatePlanner() {
      let isValid = true;
      const destinationValue = destination.value.trim();

      if (!destinationValue) {
        setPlannerError(
          destinationField,
          destination,
          destinationError,
          "Enter a destination to search this concept.",
        );
        isValid = false;
      } else {
        setPlannerError(destinationField, destination, destinationError, "");
      }

      if (checkIn.value && checkOut.value && checkOut.value < checkIn.value) {
        setPlannerError(
          checkOutField,
          checkOut,
          checkoutError,
          "Check out cannot be before check in.",
        );
        isValid = false;
      } else {
        setPlannerError(checkOutField, checkOut, checkoutError, "");
      }

      return isValid;
    }

    function updateSelectedStates() {
      planner
        .querySelectorAll(".planner-field[data-field]")
        .forEach(function (field) {
          const input = field.querySelector(".form-control");
          field.classList.toggle("is-selected", Boolean(input && input.value));
        });
    }

    function updateGuestDisplay() {
      const adultsLabel = guests.adults === 1 ? "adult" : "adults";
      const childrenLabel = guests.children === 1 ? "child" : "children";
      const childText =
        guests.children > 0 ? `, ${guests.children} ${childrenLabel}` : "";

      adultsInput.value = String(guests.adults);
      childrenInput.value = String(guests.children);
      travelersSummary.textContent = `${guests.adults} ${adultsLabel}${childText}`;
      travelers.classList.add("is-selected");

      Object.keys(guests).forEach(function (type) {
        const output = planner.querySelector(`[data-guest-count="${type}"]`);
        const minus = planner.querySelector(`[data-guest-minus="${type}"]`);
        const plus = planner.querySelector(`[data-guest-plus="${type}"]`);

        if (output) {
          output.textContent = guests[type];
        }

        if (minus) {
          minus.disabled = guests[type] <= guestLimits[type].min;
        }

        if (plus) {
          plus.disabled = guests[type] >= guestLimits[type].max;
        }
      });
    }

    function setTravelersOpen(isOpen) {
      travelers.classList.toggle("is-open", isOpen);
      travelersToggle.setAttribute("aria-expanded", String(isOpen));
      travelersMenu.hidden = !isOpen;

      if (isOpen) {
        const firstButton = travelersMenu.querySelector(
          "button:not(:disabled)",
        );
        if (firstButton) {
          firstButton.focus();
        }
      }
    }

    function normalize(value) {
      return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    }

    function findDestinationMatch(query) {
      const normalizedQuery = normalize(query);
      const candidates = document.querySelectorAll(
        "#destinations h3, #destinations h4",
      );

      return Array.from(candidates).find(function (candidate) {
        return normalize(candidate.textContent).includes(normalizedQuery);
      });
    }

    function searchFeaturedDestinations() {
      const destinationValue = destination.value.trim();
      const match = findDestinationMatch(destinationValue);
      const target = document.querySelector("#destinations");

      if (submitButton) {
        submitButton.classList.add("is-loading");
        submitButton.setAttribute("aria-busy", "true");
      }

      window.setTimeout(
        function () {
          if (submitButton) {
            submitButton.classList.remove("is-loading");
            submitButton.removeAttribute("aria-busy");
          }

          if (target) {
            scrollToTarget(target);
          }

          if (match) {
            showToast({
              title: "Featured escape found",
              message: `Taking you to inspiration related to ${destinationValue}.`,
              type: "success",
            });
          } else {
            showToast({
              title: "Destination not in this concept",
              message:
                "We couldn't find that destination in this concept yet. Explore our featured escapes below.",
              type: "error",
            });
          }
        },
        state.reduceMotion ? 0 : 280,
      );
    }

    checkIn.addEventListener("change", function () {
      updateDateRules();
      validatePlanner();
      updateSelectedStates();
    });

    checkOut.addEventListener("change", function () {
      validatePlanner();
      updateSelectedStates();
    });

    destination.addEventListener("input", function () {
      if (destination.getAttribute("aria-invalid") === "true") {
        validatePlanner();
      }
      updateSelectedStates();
    });

    travelersToggle.addEventListener("click", function () {
      setTravelersOpen(!travelers.classList.contains("is-open"));
    });

    planner
      .querySelectorAll("[data-guest-minus], [data-guest-plus]")
      .forEach(function (button) {
        button.addEventListener("click", function () {
          const type =
            button.getAttribute("data-guest-minus") ||
            button.getAttribute("data-guest-plus");
          const delta = button.hasAttribute("data-guest-plus") ? 1 : -1;

          if (!type || !guestLimits[type]) {
            return;
          }

          guests[type] = Math.min(
            guestLimits[type].max,
            Math.max(guestLimits[type].min, guests[type] + delta),
          );
          updateGuestDisplay();
        });
      });

    document.addEventListener("click", function (event) {
      if (!travelers.contains(event.target)) {
        setTravelersOpen(false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && travelers.classList.contains("is-open")) {
        setTravelersOpen(false);
        travelersToggle.focus();
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!validatePlanner()) {
        const invalidInput = planner.querySelector('[aria-invalid="true"]');

        if (invalidInput) {
          invalidInput.focus();
        }

        showToast({
          title: "Search needs a quick fix",
          message: "Please check the highlighted planner fields.",
          type: "error",
        });
        return;
      }

      setTravelersOpen(false);
      searchFeaturedDestinations();
    });

    updateDateRules();
    updateGuestDisplay();
    updateSelectedStates();
    setTravelersOpen(false);
  }

  function initContactForm() {
    const form = document.querySelector("[data-contact-form]");

    if (!form || !initOnce(form, "contactFormReady")) {
      return;
    }

    const fields = Array.from(form.querySelectorAll("[data-contact-field]"));
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function getErrorMessage(input) {
      const value = input.value.trim();
      const label = input.previousElementSibling
        ? input.previousElementSibling.textContent
        : "This field";

      if (!value) {
        return `${label} is required.`;
      }

      if (input.type === "email" && !emailPattern.test(value)) {
        return "Enter a valid email address.";
      }

      if (input.id === "contactMessage" && value.length < 12) {
        return "Message should be at least 12 characters.";
      }

      return "";
    }

    function setFieldError(field, message) {
      const input = field.querySelector(".form-control");
      const error = field.querySelector(".contact-error");
      const hasError = Boolean(message);

      field.classList.toggle("has-error", hasError);

      if (input) {
        input.setAttribute("aria-invalid", String(hasError));
      }

      if (error) {
        error.textContent = message;
      }
    }

    function validateField(field) {
      const input = field.querySelector(".form-control");
      const message = input ? getErrorMessage(input) : "";

      setFieldError(field, message);
      return !message;
    }

    function validateForm() {
      let invalidField = null;

      fields.forEach(function (field) {
        const isValid = validateField(field);

        if (!isValid && !invalidField) {
          invalidField = field;
        }
      });

      return invalidField;
    }

    fields.forEach(function (field) {
      const input = field.querySelector(".form-control");

      if (!input) {
        return;
      }

      input.addEventListener("input", function () {
        form.classList.remove("was-completed");

        if (input.getAttribute("aria-invalid") === "true") {
          validateField(field);
        }
      });
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const invalidField = validateForm();

      if (invalidField) {
        const invalidInput = invalidField.querySelector(".form-control");

        if (invalidInput) {
          invalidInput.focus();
        }

        showToast({
          message: "Please complete the highlighted fields.",
          type: "error",
        });
        return;
      }

      form.reset();
      form.classList.add("was-completed");
      fields.forEach(function (field) {
        setFieldError(field, "");
      });

      showToast({
        message: "Demo inquiry completed successfully.",
        type: "success",
      });
    });
  }

  function initNewsletterForm() {
    const form = document.querySelector("[data-newsletter-form]");

    if (!form || !initOnce(form, "newsletterFormReady")) {
      return;
    }

    const field = form.querySelector("[data-newsletter-field]");
    const email = form.querySelector("#newsletterEmail");
    const error = form.querySelector("#newsletterEmailError");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!field || !email || !error) {
      return;
    }

    function getEmailError() {
      const value = email.value.trim();

      if (!value) {
        return "Email address is required.";
      }

      if (!emailPattern.test(value)) {
        return "Enter a valid email address.";
      }

      return "";
    }

    function setError(message) {
      const hasError = Boolean(message);

      field.classList.toggle("has-error", hasError);
      email.setAttribute("aria-invalid", String(hasError));
      error.textContent = message;
    }

    email.addEventListener("input", function () {
      if (email.getAttribute("aria-invalid") === "true") {
        setError(getEmailError());
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const message = getEmailError();

      if (message) {
        setError(message);
        email.focus();
        return;
      }

      form.reset();
      setError("");
      showToast({
        message:
          "Email looks good. Thanks for joining the Roamly concept list.",
        type: "success",
        icon: "fa-envelope-open-text",
      });
    });
  }

  function initForms() {
    initContactForm();
    initNewsletterForm();
  }

  function initFaq() {
    const faq = document.querySelector("[data-faq]");

    if (!faq || !initOnce(faq, "faqReady")) {
      return;
    }

    const items = Array.from(faq.querySelectorAll("[data-faq-item]"));
    const triggers = Array.from(faq.querySelectorAll("[data-faq-trigger]"));

    if (!items.length || !triggers.length) {
      return;
    }

    faq.classList.add("is-enhanced");

    function setItemOpen(item, isOpen) {
      const trigger = item.querySelector("[data-faq-trigger]");
      const panel = item.querySelector("[data-faq-panel]");

      item.classList.toggle("is-open", isOpen);

      if (trigger) {
        trigger.setAttribute("aria-expanded", String(isOpen));
      }

      if (panel) {
        panel.hidden = !isOpen;
      }
    }

    function openOnly(itemToOpen) {
      items.forEach(function (item) {
        setItemOpen(item, item === itemToOpen);
      });
    }

    items.forEach(function (item, index) {
      setItemOpen(item, index === 0);
    });

    triggers.forEach(function (trigger, index) {
      trigger.addEventListener("click", function () {
        const item = trigger.closest("[data-faq-item]");

        if (!item) {
          return;
        }

        if (item.classList.contains("is-open")) {
          setItemOpen(item, false);
        } else {
          openOnly(item);
        }
      });

      trigger.addEventListener("keydown", function (event) {
        const lastIndex = triggers.length - 1;
        let nextIndex = index;

        if (event.key === "ArrowDown") {
          nextIndex = index === lastIndex ? 0 : index + 1;
        } else if (event.key === "ArrowUp") {
          nextIndex = index === 0 ? lastIndex : index - 1;
        } else if (event.key === "Home") {
          nextIndex = 0;
        } else if (event.key === "End") {
          nextIndex = lastIndex;
        } else {
          return;
        }

        event.preventDefault();
        triggers[nextIndex].focus();
      });
    });
  }

  function initBackToTop() {
    const controls = document.querySelectorAll('.footer-back-top[href^="#"]');

    controls.forEach(function (control) {
      if (!initOnce(control, "backToTopReady")) {
        return;
      }

      control.addEventListener("click", function (event) {
        const target = getHashTarget(control.getAttribute("href"));

        if (!target) {
          return;
        }

        event.preventDefault();
        scrollToTarget(target);
        target.setAttribute("tabindex", "-1");

        try {
          target.focus({ preventScroll: true });
        } catch (error) {
          target.focus();
        }

        if (history.pushState) {
          history.pushState(null, "", control.getAttribute("href"));
        }
      });
    });
  }

  function alignInitialHash() {
    const target = getHashTarget(window.location.hash);

    if (!target || !initOnce(document.body, "initialHashAligned")) {
      return;
    }

    nextFrame(function () {
      target.scrollIntoView({
        behavior: "auto",
        block: "start",
      });
    });
  }

  function initScrollAnimations() {
    const revealItems = document.querySelectorAll("[data-reveal]");

    if (!revealItems.length || !initOnce(document.body, "scrollRevealReady")) {
      return;
    }

    if (state.reduceMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach(function (item) {
        item.classList.add("is-visible");
      });
      return;
    }

    document.body.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.18,
        rootMargin: "0px 0px -8% 0px",
      },
    );

    revealItems.forEach(function (item, index) {
      item.style.transitionDelay = `${Math.min(index * 45, 180)}ms`;
      observer.observe(item);
    });
  }

  function initStatsCounter() {
    const highlightSection = document.querySelector(
      "[data-discovery-highlights]",
    );

    if (!highlightSection || !initOnce(highlightSection, "statsReady")) {
      return;
    }

    const experienceCategories = new Set(
      Array.from(document.querySelectorAll(".experience-category"))
        .map(function (category) {
          return category.textContent.trim();
        })
        .filter(Boolean),
    );
    const counts = {
      destinations: document.querySelectorAll("[data-destination-id]").length,
      "travel-styles": Array.from(
        document.querySelectorAll("[data-filter]"),
      ).filter(function (filter) {
        return filter.getAttribute("data-filter") !== "all";
      }).length,
      "experience-categories": experienceCategories.size,
      "journey-planners": document.querySelectorAll("[data-trip-planner]")
        .length,
    };
    const stats = highlightSection.querySelectorAll("[data-stat-source]");

    function formatCount(value) {
      return String(value).padStart(2, "0");
    }

    function setCount(element, value) {
      element.textContent = formatCount(value);
    }

    function animateCount(element, target) {
      const duration = 520;
      const startTime = window.performance.now();

      function tick(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        setCount(element, Math.round(target * easedProgress));

        if (progress < 1) {
          window.requestAnimationFrame(tick);
        }
      }

      window.requestAnimationFrame(tick);
    }

    function renderStats(shouldAnimate) {
      stats.forEach(function (stat) {
        const source = stat.getAttribute("data-stat-source");
        const target = counts[source] || 0;

        if (shouldAnimate) {
          animateCount(stat, target);
        } else {
          setCount(stat, target);
        }
      });
    }

    if (state.reduceMotion || !("requestAnimationFrame" in window)) {
      renderStats(false);
      return;
    }

    if (!("IntersectionObserver" in window)) {
      renderStats(true);
      return;
    }

    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            renderStats(true);
            observer.disconnect();
          }
        });
      },
      {
        threshold: 0.35,
      },
    );

    observer.observe(highlightSection);
  }

  function initVideoModal() {
    const storySection = document.querySelector(".brand-story");

    if (!storySection || !initOnce(storySection, "videoModalReady")) {
      return;
    }

    const openButton = storySection.querySelector("[data-story-open]");
    const modal = storySection.querySelector("[data-story-modal]");
    const modalVideo = storySection.querySelector("[data-story-modal-video]");
    const previewVideo = storySection.querySelector(
      "[data-story-preview-video]",
    );
    const closeControls = storySection.querySelectorAll("[data-story-close]");
    let lastFocusedElement = null;

    if (
      !openButton ||
      !modal ||
      !modalVideo ||
      !modalVideo.querySelector("source[src]")
    ) {
      return;
    }

    if (
      previewVideo &&
      previewVideo.querySelector("source[src]") &&
      !state.reduceMotion
    ) {
      previewVideo.play().catch(function () {});
    }

    function getFocusableElements() {
      return modal.querySelectorAll(
        'button, [href], video[controls], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
    }

    function openModal() {
      lastFocusedElement = document.activeElement;
      modal.hidden = false;
      openButton.setAttribute("aria-expanded", "true");
      document.body.classList.add("story-modal-open");
      modalVideo.currentTime = 0;
      modalVideo.play().catch(function () {});

      const focusable = getFocusableElements();
      if (focusable.length) {
        focusable[0].focus();
      }
    }

    function closeModal() {
      modalVideo.pause();
      modal.hidden = true;
      openButton.setAttribute("aria-expanded", "false");
      document.body.classList.remove("story-modal-open");

      if (lastFocusedElement) {
        lastFocusedElement.focus();
      }
    }

    function trapFocus(event) {
      if (modal.hidden || event.key !== "Tab") {
        return;
      }

      const focusable = Array.from(getFocusableElements());

      if (!focusable.length) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    openButton.addEventListener("click", openModal);

    closeControls.forEach(function (control) {
      control.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && !modal.hidden) {
        closeModal();
      }

      trapFocus(event);
    });
  }

  function initToast() {
    createToastRegion();
  }

  function initRoamly() {
    initToast();
    initNavigation();
    initSkipLink();
    initSmoothAnchors();
    initDestinationFilters();
    initFavorites();
    initTripPlanner();
    initForms();
    initFaq();
    initBackToTop();
    alignInitialHash();
    initScrollAnimations();
    initStatsCounter();
    initVideoModal();
  }

  onReady(initRoamly);
})();
