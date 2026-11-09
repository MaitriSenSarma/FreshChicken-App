
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  MapPin,
  Plus,
  ShieldCheck,
  Truck,
  Search,
  X,
} from "lucide-react";
import "./Address.css";
import api from "./api";

type AddressProps = {
  onBack?: () => void;
  onContinue?: (details: DeliveryDetails) => void;
};

export type DeliveryDetails = {
  fullName: string;
  phone: string;
  apartment: string;
  apartmentId: number | null;
  apartmentPincode: string;
  flatNumber: string;
  floor: string;
  landmark: string;
};

type ApprovedApartment = {
  id: number;
  name: string;
  area: string;
  full_address: string;
  pincode: string;
  latitude: string | null;
  longitude: string | null;
};

const EMPTY_DETAILS: DeliveryDetails = {
  fullName: "",
  phone: "",
  apartment: "",
  apartmentId: null,
  apartmentPincode: "",
  flatNumber: "",
  floor: "",
  landmark: "",
};

export default function Address({ onBack, onContinue }: AddressProps) {
  const [details, setDetails] = useState<DeliveryDetails>(EMPTY_DETAILS);
  const [savedAddresses, setSavedAddresses] = useState<DeliveryDetails[]>([]);
  const [selectedSaved, setSelectedSaved] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(true);
  const [apartmentSearch, setApartmentSearch] = useState("");
  const [showApartmentResults, setShowApartmentResults] = useState(false);
  const [apartments, setApartments] = useState<ApprovedApartment[]>([]);
  const [loadingApartments, setLoadingApartments] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Load approved apartments from Django.
  useEffect(() => {
    let cancelled = false;

    async function loadApartments() {
      setLoadingApartments(true);

      try {
        const response = await api.get<ApprovedApartment[]>("/apartments/");

        if (!cancelled) {
          setApartments(response.data);
          setError("");
        }
      } catch (err) {
        console.error("Failed to load delivery apartments:", err);

        if (!cancelled) {
          setApartments([]);
          setError(
            "Unable to load delivery locations. Please refresh and try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingApartments(false);
        }
      }
    }

    loadApartments();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredApartments = useMemo(() => {
    const query = apartmentSearch.trim().toLowerCase();

    if (!query) return apartments;

    return apartments.filter(
      (apartment) =>
        apartment.name.toLowerCase().includes(query) ||
        apartment.pincode.includes(query) ||
        apartment.area.toLowerCase().includes(query)
    );
  }, [apartmentSearch, apartments]);

  function update<K extends keyof DeliveryDetails>(
    key: K,
    value: DeliveryDetails[K]
  ) {
    setDetails((current) => ({ ...current, [key]: value }));
    setError("");
    setSuccess("");
  }

  function selectApartment(apartment: ApprovedApartment) {
    setDetails((current) => ({
      ...current,
      apartment: apartment.name,
      apartmentId: apartment.id,
      apartmentPincode: apartment.pincode,
    }));

    setApartmentSearch(`${apartment.name} — ${apartment.pincode}`);
    setShowApartmentResults(false);
    setSelectedSaved(null);
    setError("");
    setSuccess("");
  }

  function chooseSavedAddress(index: number) {
    const address = savedAddresses[index];

    // Do not reuse an address whose apartment is no longer available.
    const stillAvailable = apartments.some(
      (apartment) =>
        apartment.id === address.apartmentId &&
        apartment.name === address.apartment &&
        apartment.pincode === address.apartmentPincode
    );

    if (!stillAvailable) {
      setError(
        "This saved apartment is no longer available. Please select another location."
      );
      setShowForm(true);
      setSelectedSaved(null);
      return;
    }

    setSelectedSaved(index);
    setDetails(address);
    setApartmentSearch(
      `${address.apartment} — ${address.apartmentPincode}`
    );
    setShowForm(false);
    setError("");
    setSuccess("");
  }

  function saveAndContinue() {
    setError("");
    setSuccess("");

    if (loadingApartments) {
      setError("Please wait while delivery locations are loading.");
      return;
    }

    if (!details.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(details.phone.trim())) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    const selectedApartment = apartments.find(
      (apartment) =>
        apartment.id === details.apartmentId &&
        apartment.name === details.apartment &&
        apartment.pincode === details.apartmentPincode
    );

    if (!selectedApartment) {
      setError("Please select an available apartment from the list.");
      return;
    }

    if (!details.flatNumber.trim()) {
      setError("Please enter your flat or house number.");
      return;
    }

    const normalizedDetails: DeliveryDetails = {
      ...details,
      fullName: details.fullName.trim(),
      phone: details.phone.trim(),
      flatNumber: details.flatNumber.trim(),
      floor: details.floor.trim(),
      landmark: details.landmark.trim(),
    };

    const existingIndex = savedAddresses.findIndex(
      (address) =>
        address.phone === normalizedDetails.phone &&
        address.apartmentId === normalizedDetails.apartmentId &&
        address.flatNumber === normalizedDetails.flatNumber
    );

    let updatedAddresses = savedAddresses;
    let selectedIndex = existingIndex;

    if (existingIndex === -1) {
      updatedAddresses = [...savedAddresses, normalizedDetails];
      selectedIndex = updatedAddresses.length - 1;
      setSavedAddresses(updatedAddresses);
    }

    setSelectedSaved(selectedIndex);
    setDetails(normalizedDetails);
    setShowForm(false);
    setSuccess("Delivery address selected successfully.");

    window.localStorage.setItem(
      "freshmeat-delivery-address",
      JSON.stringify(normalizedDetails)
    );

    if (onContinue) {
  onContinue(normalizedDetails);
} else {
  window.location.href = "/checkout";
}
  }

  function addNewAddress() {
    setDetails(EMPTY_DETAILS);
    setApartmentSearch("");
    setSelectedSaved(null);
    setShowForm(true);
    setError("");
    setSuccess("");
  }

  function clearApartmentSearch() {
    setApartmentSearch("");
    setDetails((current) => ({
      ...current,
      apartment: "",
      apartmentId: null,
      apartmentPincode: "",
    }));
    setShowApartmentResults(true);
    setError("");
    setSuccess("");
  }

  return (
    <main className="address-page">
      <header className="address-header">
        <button
          type="button"
          className="address-back"
          onClick={onBack ?? (() => window.history.back())}
          aria-label="Go back"
        >
          <ArrowLeft size={19} />
        </button>

        <a className="address-brand" href="/" aria-label="FRESHCA home">
          <span className="address-brand-mark">F</span>
          <span>
            FRESH<span>CA</span>
          </span>
        </a>

        <div className="address-header-label">
          <ShieldCheck size={17} />
          <span>Secure checkout</span>
        </div>
      </header>

      <section className="address-hero">
        <div>
          <span className="address-eyebrow">ALMOST THERE</span>
          <h1>
            Where should we <span>deliver?</span>
          </h1>
          <p>Select an approved apartment and add your delivery details.</p>
        </div>

        <div className="address-hero-icon">
          <MapPin size={50} />
        </div>
      </section>

      <div className="address-layout">
        <section className="address-main-card">
          <div className="address-section-title">
            <span className="address-step">1</span>
            <div>
              <h2>Delivery address</h2>
              <p>Search by apartment name, area or PIN code.</p>
            </div>
          </div>

          {savedAddresses.length > 0 && (
            <div className="saved-addresses">
              <h3>Saved addresses</h3>

              {savedAddresses.map((address, index) => (
                <button
                  type="button"
                  key={`${address.phone}-${address.apartmentId}-${address.flatNumber}`}
                  className={`saved-address-option ${
                    selectedSaved === index ? "selected" : ""
                  }`}
                  onClick={() => chooseSavedAddress(index)}
                >
                  <span className="saved-address-radio">
                    {selectedSaved === index && <span />}
                  </span>

                  <span className="saved-address-copy">
                    <strong>{address.apartment}</strong>
                    <small>
                      PIN {address.apartmentPincode} · {address.flatNumber}
                      {address.floor ? `, ${address.floor}` : ""}
                      {address.landmark ? ` · ${address.landmark}` : ""}
                    </small>
                  </span>

                  <span className="saved-address-name">
                    {address.fullName}
                  </span>
                </button>
              ))}

              <button
                type="button"
                className="address-add-new"
                onClick={addNewAddress}
              >
                <Plus size={17} /> Add a new address
              </button>
            </div>
          )}

          {showForm && (
            <div className="address-form">
              <div className="address-field">
                <label htmlFor="delivery-name">Full name *</label>
                <input
                  id="delivery-name"
                  value={details.fullName}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="Enter recipient's full name"
                  autoComplete="name"
                />
              </div>

              <div className="address-field">
                <label htmlFor="delivery-phone">Mobile number *</label>
                <div className="address-phone-input">
                  <span>+91</span>
                  <input
                    id="delivery-phone"
                    inputMode="numeric"
                    maxLength={10}
                    value={details.phone}
                    onChange={(e) =>
                      update(
                        "phone",
                        e.target.value.replace(/\D/g, "").slice(0, 10)
                      )
                    }
                    placeholder="10-digit mobile number"
                    autoComplete="tel-national"
                  />
                </div>
              </div>

              <div className="address-field apartment-search-field">
                <label htmlFor="delivery-apartment-search">
                  Apartment / society *
                </label>

                <div className="apartment-search-box">
                  <Search size={18} aria-hidden="true" />

                  <input
                    id="delivery-apartment-search"
                    value={apartmentSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setApartmentSearch(value);
                      setShowApartmentResults(true);
                      setError("");
                      setSuccess("");

                      const exactMatch = apartments.find(
                        (apartment) =>
                          `${apartment.name} — ${apartment.pincode}` === value
                      );

                      if (!exactMatch) {
                        setDetails((current) => ({
                          ...current,
                          apartment: "",
                          apartmentId: null,
                          apartmentPincode: "",
                        }));
                      }
                    }}
                    onFocus={() => setShowApartmentResults(true)}
                    placeholder={
                      loadingApartments
                        ? "Loading apartments..."
                        : "Search apartment name or PIN code"
                    }
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={showApartmentResults}
                    aria-controls="approved-apartment-results"
                    disabled={loadingApartments}
                  />

                  {apartmentSearch && (
                    <button
                      type="button"
                      className="apartment-clear"
                      aria-label="Clear apartment search"
                      onClick={clearApartmentSearch}
                    >
                      <X size={16} />
                    </button>
                  )}

                  <ChevronDown size={17} aria-hidden="true" />
                </div>

                {loadingApartments && (
                  <p className="address-hint">Loading delivery locations…</p>
                )}

                {!loadingApartments && showApartmentResults && (
                  <div
                    id="approved-apartment-results"
                    className="apartment-results"
                    role="listbox"
                  >
                    {filteredApartments.length > 0 ? (
                      filteredApartments.map((apartment) => (
                        <button
                          type="button"
                          role="option"
                          aria-selected={
                            details.apartmentId === apartment.id
                          }
                          key={apartment.id}
                          className={`apartment-result ${
                            details.apartmentId === apartment.id
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => selectApartment(apartment)}
                        >
                          <span className="apartment-result-icon">
                            <MapPin size={17} />
                          </span>

                          <span className="apartment-result-copy">
                            <strong>{apartment.name}</strong>
                            <small>
                              {apartment.area
                                ? `${apartment.area} · `
                                : ""}
                              PIN code: {apartment.pincode}
                            </small>
                          </span>

                          {details.apartmentId === apartment.id && (
                            <CheckCircle2 size={18} />
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="apartment-no-results">
                        {apartments.length === 0
                          ? "No approved apartments are available yet."
                          : "No approved apartment found. Try another name or PIN code."}
                      </p>
                    )}

                    <p className="apartment-result-count">
                      {filteredApartments.length} of {apartments.length}{" "}
                      approved apartments
                    </p>
                  </div>
                )}

                {details.apartment && (
                  <p className="address-hint">
                    Selected: {details.apartment}, PIN{" "}
                    {details.apartmentPincode}
                  </p>
                )}

                <p className="address-hint">
                  Delivery is available only to apartments approved by the
                  FreshMeat admin.
                </p>
              </div>

              <div className="address-form-row">
                <div className="address-field">
                  <label htmlFor="delivery-flat">Flat / house number *</label>
                  <input
                    id="delivery-flat"
                    value={details.flatNumber}
                    onChange={(e) => update("flatNumber", e.target.value)}
                    placeholder="e.g. Flat 4B"
                    autoComplete="address-line1"
                  />
                </div>

                <div className="address-field">
                  <label htmlFor="delivery-floor">Floor (optional)</label>
                  <input
                    id="delivery-floor"
                    value={details.floor}
                    onChange={(e) => update("floor", e.target.value)}
                    placeholder="e.g. 3rd floor"
                  />
                </div>
              </div>

              <div className="address-field">
                <label htmlFor="delivery-landmark">Landmark (optional)</label>
                <input
                  id="delivery-landmark"
                  value={details.landmark}
                  onChange={(e) => update("landmark", e.target.value)}
                  placeholder="Nearby landmark"
                  autoComplete="address-line2"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="address-alert address-alert-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div
              className="address-alert address-alert-success"
              role="status"
            >
              <CheckCircle2 size={18} /> {success}
            </div>
          )}

          {!showForm && selectedSaved !== null && (
            <div className="selected-address-summary">
              <MapPin size={20} />
              <div>
                <strong>{details.apartment}</strong>
                <p>
                  PIN {details.apartmentPincode} · {details.flatNumber}
                  {details.floor ? `, ${details.floor}` : ""}
                </p>
                <small>
                  {details.fullName} · +91 {details.phone}
                </small>
              </div>
              <button type="button" onClick={() => setShowForm(true)}>
                Edit
              </button>
            </div>
          )}

          <button
            type="button"
            className="address-continue"
            onClick={saveAndContinue}
            disabled={loadingApartments}
          >
            Continue to checkout <span>→</span>
          </button>

          <p className="address-disclaimer">
            Apartment availability is loaded from the FreshMeat backend.
            Customers must provide their flat number and may add a landmark.
          </p>
        </section>

        <aside className="address-side-card">
          <div className="address-side-icon">
            <Truck size={24} />
          </div>

          <h2>Delivery availability</h2>
          <p>
            FreshMeat delivers only to active, approved apartments listed by
            the admin.
          </p>

          <div className="address-side-divider" />

          <div className="address-side-row">
            <CheckCircle2 size={17} />
            <span>Search by apartment name or PIN code</span>
          </div>

          <div className="address-side-row">
            <CheckCircle2 size={17} />
            <span>Enter a valid contact number</span>
          </div>

          <div className="address-side-row">
            <CheckCircle2 size={17} />
            <span>Provide flat and floor details</span>
          </div>

          <div className="address-demo-note">
            <strong>
              {loadingApartments
                ? "Loading approved apartments…"
                : `${apartments.length} approved apartment entries`}
            </strong>
            <span>
              Apartment locations are managed from Django Admin.
            </span>
          </div>
        </aside>
      </div>

      <footer className="address-footer">
        <a className="address-brand" href="/" aria-label="FRESHCA home">
          <span className="address-brand-mark">F</span>
          <span>
            FRESH<span>CA</span>
          </span>
        </a>
        <span>© {new Date().getFullYear()} FRESHCA</span>
      </footer>
    </main>
  );
}
