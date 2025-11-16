import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import "./App.css";

// ✅ Add API_BASE at the top (after imports)
// const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_BASE = "https://formbackand.up.railway.app";
// ------------------- Zod Validation -------------------
// Fixed validation schema
const formSchema = (isEdit = false) =>
  z.object({
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    email: z.string().email("Enter a valid email"),
    contact: z.string().regex(/^[0-9]{11}$/, "Contact must be 11 digits"),
    gender: z.string().min(1, "Gender is required"),
    hobbies: z.array(z.string()).min(1, "Select at least one hobby"),
    subject: z.string().min(1, "Please select a subject"),
    about: z.string().min(20, "Write at least 20 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[!@#$%^&*]/, "Must contain a special character (!@#$%^&*)"),
    rePassword: z.string(),
    resume: isEdit
      ? z.any().optional()
      : z
          .any()
          .refine(
            (files) => files && files.length > 0,
            "Resume file is required"
          )
          .refine(
            (files) => files && files[0] && files[0].size < 2 * 1024 * 1024,
            "File must be < 2MB"
          ),
  });

// Password match validation
const finalSchema = (isEdit = false) =>
  formSchema(isEdit).refine((data) => data.password === data.rePassword, {
    message: "Passwords do not match",
    path: ["rePassword"],
  });

function App() {
  const [passwordStrength, setPasswordStrength] = useState("");
  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(finalSchema(editingId !== null)),
  });

  const passwordValue = watch("password");

  // ------------------- Password Strength -------------------
  const checkPasswordStrength = (pwd) => {
    if (!pwd) setPasswordStrength("");
    else if (pwd.length < 8) setPasswordStrength("weak");
    else if (!/[!@#$%^&*]/.test(pwd)) setPasswordStrength("medium");
    else setPasswordStrength("strong");
  };

  // ------------------- Delete Record -------------------
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      try {
        // ✅ FIXED: Using API_BASE variable
        const res = await fetch(`${API_BASE}/api/upload/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setRecords((prev) => prev.filter((r) => r._id !== id));
          alert("Record deleted successfully!");
        } else {
          alert("Failed to delete record");
        }
      } catch (error) {
        console.error("Delete error:", error);
      }
    }
  };

  // ------------------- Inside App component -------------------
  const watchedHobbies = watch("hobbies") || [];

  // ------------------- Edit Mode -------------------
  const handleEdit = (record) => {
    if (!record) return;
    setEditingId(record._id);

    setValue("fullName", record.fullName);
    setValue("email", record.email);
    setValue("contact", record.contact);
    setValue("gender", record.gender);
    setValue("subject", record.subject);
    setValue("about", record.about);
    setValue("password", record.password);
    setValue("rePassword", record.password);
    
    // FIX: Ensure hobbies is always an array
    setValue("hobbies", Array.isArray(record.hobbies) ? record.hobbies : []);

    window.scrollTo(0, 0);
  };

  // ------------------- Form Submit -------------------
const onSubmit = async (data) => {
  try {
    const formData = new FormData();

    // Append all basic fields
    formData.append("fullName", data.fullName);
    formData.append("email", data.email);
    formData.append("contact", data.contact);
    formData.append("gender", data.gender);
    formData.append("subject", data.subject);
    formData.append("about", data.about);
    formData.append("password", data.password);
    formData.append("rePassword", data.rePassword);

    // FIX: Append hobbies correctly - as simple field names
    if (data.hobbies && Array.isArray(data.hobbies)) {
      data.hobbies.forEach((hobby) => {
        formData.append("hobbies", hobby); // Just "hobbies" not "hobbies[]"
      });
    }

    // Append resume file if it exists
    if (data.resume?.[0]) {
      formData.append("resume", data.resume[0]);
    }

    // ✅ FIXED: Using API_BASE variable
    const url = editingId
      ? `${API_BASE}/api/upload/${editingId}`
      : `${API_BASE}/api/upload`;
    const method = editingId ? "PUT" : "POST";

    console.log("Hobbies being sent:", data.hobbies);

    const res = await fetch(url, { 
      method, 
      body: formData
    });
    
    const result = await res.json();

    if (res.ok) {
      alert(editingId ? "Updated!" : "Submitted!");
      console.log("Server response:", result);

      // ✅ FIXED: Using API_BASE variable
      // Force refresh the records
      const refreshRes = await fetch(`${API_BASE}/api/upload`);
      const refreshedData = await refreshRes.json();
      setRecords(refreshedData.filter(Boolean));

      setEditingId(null);
      reset();
      setPasswordStrength("");
    } else {
      alert(result.error || "Error submitting form");
    }
  } catch (error) {
    console.log("Form upload error:", error);
    alert("Form upload error");
  }
};

  const handleCancelEdit = () => {
    setEditingId(null);
    reset();
  };

  // ------------------- Fetch All Records -------------------
  useEffect(() => {
    const load = async () => {
      try {
        // ✅ FIXED: Using API_BASE variable
        const res = await fetch(`${API_BASE}/api/upload`);
        const data = await res.json();
        setRecords(data.filter(Boolean));
      } catch (err) {
        console.log("Fetch error:", err);
      }
    };
    load();
  }, []);

  return (
    <div className="app">
      <div className="main-container">
        {/* -------------------- FORM -------------------- */}
        <div className="form-container">
          <h1>{editingId ? "Edit Registration" : "Registration Form"}</h1>

          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Full Name */}
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" {...register("fullName")} />
              {errors.fullName && (
                <p className="error-text">{errors.fullName.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label>Email</label>
              <input type="email" {...register("email")} />
              {errors.email && (
                <p className="error-text">{errors.email.message}</p>
              )}
            </div>

            {/* Contact */}
            <div className="form-group">
              <label>Contact</label>
              <input type="text" {...register("contact")} />
              {errors.contact && (
                <p className="error-text">{errors.contact.message}</p>
              )}
            </div>

            {/* Gender */}
            <div className="form-group">
              <label>Gender</label>
              <select {...register("gender")}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && (
                <p className="error-text">{errors.gender.message}</p>
              )}
            </div>

            {/* Hobbies */}
            <div className="form-group">
              <label>Hobbies</label>
              <div className="radio-group">
                {[
                  "Sports",
                  "Programming",
                  "Cricket",
                  "Reading",
                  "Net surfing / Chatting",
                ].map((hobby) => (
                  <label key={hobby} className="radio-label">
                    <input
                      type="checkbox"
                      value={hobby}
                      {...register("hobbies")}
                      checked={watchedHobbies.includes(hobby)}
                      onChange={(e) => {
                        const value = e.target.value;
                        const currentHobbies = watchedHobbies;
                        if (e.target.checked) {
                          setValue("hobbies", [...currentHobbies, value]);
                        } else {
                          setValue(
                            "hobbies",
                            currentHobbies.filter((h) => h !== value)
                          );
                        }
                      }}
                    />
                    {hobby}
                  </label>
                ))}
              </div>
              {errors.hobbies && (
                <p className="error-text">{errors.hobbies.message}</p>
              )}
            </div>

            {/* Subject */}
            <div className="form-group">
              <label>Subject</label>
              <select {...register("subject")}>
                <option value="">Select</option>
                <option value="Math">Math</option>
                <option value="Science">Science</option>
                <option value="English">English</option>
              </select>
              {errors.subject && (
                <p className="error-text">{errors.subject.message}</p>
              )}
            </div>

            {/* Resume */}
            <div className="form-group">
              <label>Upload Resume {editingId ? "(Optional)" : ""}</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                {...register("resume")}
              />
              {errors.resume && (
                <p className="error-text">{errors.resume.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                {...register("password")}
                onChange={(e) => {
                  register("password").onChange(e);
                  checkPasswordStrength(e.target.value);
                }}
              />
              {errors.password && (
                <p className="error-text">{errors.password.message}</p>
              )}
              {passwordStrength && (
                <p className={`password-strength ${passwordStrength}`}>
                  {passwordStrength === "weak"
                    ? "Weak"
                    : passwordStrength === "medium"
                    ? "Medium"
                    : "Strong"}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" {...register("rePassword")} />
              {errors.rePassword && (
                <p className="error-text">{errors.rePassword.message}</p>
              )}
            </div>

            {/* About */}
            <div className="form-group">
              <label>About</label>
              <textarea rows="4" {...register("about")} />
              {errors.about && (
                <p className="error-text">{errors.about.message}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="button-group">
              <button type="submit" className="submit-btn">
                {editingId ? "Update" : "Submit"}
              </button>
              <button
                type="button"
                className="reset-btn"
                onClick={() => {
                  reset();
                  setEditingId(null);
                }}
              >
                Reset
              </button>
              {editingId && (
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={handleCancelEdit}
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        {/* -------------------- RECORDS -------------------- */}
        <div className="records-container">
          <h2>Submitted Records ({records.length})</h2>
          {records.length === 0 ? (
            <p className="no-records">No records found.</p>
          ) : (
            <div className="records-list">
              {records.map((r) =>
                r ? (
                  <div className="record-card" key={r._id}>
                    <div className="record-header">
                      <h3>{r.fullName}</h3>
                      <div className="card-actions">
                        <button
                          className="edit-btn"
                          onClick={() => handleEdit(r)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(r._id)}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    <div className="record-details">
                      <p>
                        <strong>Email:</strong> {r.email}
                      </p>
                      <p>
                        <strong>Contact:</strong> {r.contact}
                      </p>
                      <p>
                        <strong>Gender:</strong> {r.gender}
                      </p>
                      <p>
                        <strong>Subject:</strong> {r.subject}
                      </p>
                      <p>
                        <strong>Hobbies:</strong> {r.hobbies?.join(", ") || "None"}
                      </p>
                      <p>
                        <strong>About:</strong> {r.about}
                      </p>
                      {r.resumeUrl && (
                        <p>
                          <strong>Resume:</strong>{" "}
                          {/* ✅ FIXED: Using API_BASE variable for resume download */}
                          <a
                            href={`${API_BASE}${r.resumeUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download Resume
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;