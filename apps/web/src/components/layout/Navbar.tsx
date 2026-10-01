// import React, { useState, useRef, useEffect } from 'react';
// import { Link, useNavigate } from 'react-router-dom';

// interface UserData {
//   id: string;
//   email: string;
//   name: string;
//   role: string;
// }

// export const Navbar: React.FC = () => {
//   const navigate = useNavigate();
//   const [isDropdownOpen, setIsDropdownOpen] = useState(false);
//   const dropdownRef = useRef<HTMLDivElement | null>(null);

//   const token = localStorage.getItem('accessToken');
//   const userRaw = localStorage.getItem('user');

//   // Safely parse user JSON from localStorage
//   let user: UserData | null = null;
//   if (userRaw) {
//     try {
//       user = JSON.parse(userRaw);
//     } catch (error) {
//       console.error('Failed to parse user data from localStorage:', error);
//     }
//   }

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       if (
//         dropdownRef.current &&
//         !dropdownRef.current.contains(event.target as Node)
//       ) {
//         setIsDropdownOpen(false);
//       }
//     };

//     document.addEventListener('mousedown', handleClickOutside);
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, []);

//   const handleSignOut = () => {
//     localStorage.removeItem('accessToken');
//     localStorage.removeItem('user');
//     setIsDropdownOpen(false);
//     navigate('/login');
//     window.location.reload();
//   };

//   // Extract initials for fallback avatar (e.g. "Parth Sharma" -> "PS")
//   const getInitials = (name?: string) => {
//     if (!name) return 'U';
//     const parts = name.trim().split(' ');
//     if (parts.length >= 2) {
//       return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
//     }
//     return name.slice(0, 2).toUpperCase();
//   };

//   return (
//     <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-8 lg:px-16 py-4 flex items-center justify-between">
//       <Link to="/" className="text-2xl font-black text-red-600 tracking-wider">
//         STREAM<span className="text-white">VERSE</span>
//       </Link>

//       <div className="flex items-center gap-4">
//         {token && user ? (
//           <div className="relative" ref={dropdownRef}>
//             {/* Profile Avatar Button */}
//             <button
//               type="button"
//               onClick={() => setIsDropdownOpen((prev) => !prev)}
//               className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all focus:outline-none"
//               aria-expanded={isDropdownOpen}
//               aria-label="User menu"
//             >
//               <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-red-600 to-amber-500 text-white font-bold flex items-center justify-center shadow-md">
//                 {getInitials(user.name)}
//               </div>
//               <div className="hidden sm:flex flex-col text-left">
//                 <span className="text-sm font-semibold text-slate-100 leading-tight">
//                   {user.name}
//                 </span>
//                 <span className="text-xs text-slate-400 capitalize">
//                   {user.role.toLowerCase()}
//                 </span>
//               </div>
//               {/* Chevron Icon */}
//               <svg
//                 className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
//                   isDropdownOpen ? 'rotate-180' : ''
//                 }`}
//                 fill="none"
//                 stroke="currentColor"
//                 viewBox="0 0 24 24"
//               >
//                 <path
//                   strokeLinecap="round"
//                   strokeLinejoin="round"
//                   strokeWidth="2"
//                   d="M19 9l-7 7-7-7"
//                 />
//               </svg>
//             </button>

//             {/* Dropdown Menu */}
//             {isDropdownOpen && (
//               <div className="absolute right-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-100">
//                 {/* User Info Header */}
//                 <div className="px-4 py-3 border-b border-slate-800/80">
//                   <p className="text-sm font-bold text-white truncate">
//                     {user.name}
//                   </p>
//                   <p className="text-xs text-slate-400 truncate mt-0.5">
//                     {user.email}
//                   </p>
//                   <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/60 text-red-400 border border-red-800/50">
//                     Role: {user.role}
//                   </div>
//                 </div>

//                 {/* Dropdown Action Items */}
//                 <div className="py-1">
//                   <button
//                     type="button"
//                     onClick={handleSignOut}
//                     className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300 font-medium transition-colors flex items-center gap-2"
//                   >
//                     <svg
//                       className="w-4 h-4"
//                       fill="none"
//                       stroke="currentColor"
//                       viewBox="0 0 24 24"
//                     >
//                       <path
//                         strokeLinecap="round"
//                         strokeLinejoin="round"
//                         strokeWidth="2"
//                         d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
//                       />
//                     </svg>
//                     Sign Out
//                   </button>
//                 </div>
//               </div>
//             )}
//           </div>
//         ) : (
//           <>
//             <Link
//               to="/login"
//               className="px-5 py-2 text-sm text-slate-300 hover:text-white font-medium transition-colors"
//             >
//               Sign In
//             </Link>
//             <Link
//               to="/register"
//               className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-red-600/20"
//             >
//               Get Started
//             </Link>
//           </>
//         )}
//       </div>
//     </nav>
//   );
// };
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface UserData {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const token = localStorage.getItem('accessToken');
  const userRaw = localStorage.getItem('user');

  // Safely parse user JSON from localStorage
  let user: UserData | null = null;
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch (error) {
      console.error('Failed to parse user data from localStorage:', error);
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    setIsDropdownOpen(false);
    navigate('/login');
    window.location.reload();
  };

  // Extract initials for fallback avatar (e.g. "Parth Sharma" -> "PS")
  const getInitials = (name?: string) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isCreatorOrAdmin =
    user?.role === 'CREATOR' || user?.role === 'ADMIN';

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-8 lg:px-16 py-4 flex items-center justify-between">
      <Link to="/" className="text-2xl font-black text-red-600 tracking-wider">
        STREAM<span className="text-white">VERSE</span>
      </Link>

      <div className="flex items-center gap-4">
        {token && user ? (
          <div className="relative" ref={dropdownRef}>
            {/* Profile Avatar Button */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all focus:outline-none"
              aria-expanded={isDropdownOpen}
              aria-label="User menu"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-red-600 to-amber-500 text-white font-bold flex items-center justify-center shadow-md">
                {getInitials(user.name)}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-sm font-semibold text-slate-100 leading-tight">
                  {user.name}
                </span>
                <span className="text-xs text-slate-400 capitalize">
                  {user.role.toLowerCase()}
                </span>
              </div>
              {/* Chevron Icon */}
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                  isDropdownOpen ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-100">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-slate-800/80">
                  <p className="text-sm font-bold text-white truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">
                    {user.email}
                  </p>
                  <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-red-950/60 text-red-400 border border-red-800/50">
                    Role: {user.role}
                  </div>
                </div>

                {/* Dropdown Action Items */}
                <div className="py-1 border-b border-slate-800/80">
                  {isCreatorOrAdmin && (
                    <Link
                      to="/creator"
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 hover:text-white font-medium transition-colors flex items-center gap-2.5"
                    >
                      <svg
                        className="w-4 h-4 text-red-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Creator Studio
                    </Link>
                  )}
                </div>

                {/* Sign Out Action */}
                <div className="py-1">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300 font-medium transition-colors flex items-center gap-2.5"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link
              to="/login"
              className="px-5 py-2 text-sm text-slate-300 hover:text-white font-medium transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-red-600/20"
            >
              Get Started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};