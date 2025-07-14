// Subject-specific learning resources for Kana AI Learning Assistant
export const SUBJECT_RESOURCES = {
  'Unity VR Development': {
    'pickup|grab|interact|object.*interact': [
      {
        title: "Unity VR Object Interaction Tutorial",
        url: "https://www.youtube.com/watch?v=2WisM6xcboo",
        description: "Complete guide to VR object pickup and interaction"
      },
      {
        title: "VR Interaction Framework - Unity Learn",
        url: "https://learn.unity.com/tutorial/vr-interaction-framework",
        description: "Official Unity VR interaction system tutorial"
      },
      {
        title: "How to Pick Up Objects in VR",
        url: "https://www.youtube.com/watch?v=DA_cFl_MN_k",
        description: "Step-by-step VR object grabbing mechanics"
      },
      {
        title: "Unity XR Interaction Toolkit",
        url: "https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@latest/",
        description: "Official XR Interaction Toolkit documentation"
      }
    ],
    'teleport|movement|locomotion': [
      {
        title: "VR Teleportation Tutorial - Unity",
        url: "https://www.youtube.com/watch?v=KHWuTBmT1oI",
        description: "Implementing VR teleportation systems"
      },
      {
        title: "VR Locomotion Techniques",
        url: "https://learn.unity.com/tutorial/vr-locomotion",
        description: "Different approaches to VR movement"
      },
      {
        title: "Unity VR Movement Scripts",
        url: "https://www.youtube.com/watch?v=2D_qEgk_ZLs",
        description: "Complete VR movement implementation"
      }
    ],
    'default': [
      {
        title: "Unity VR Development Course",
        url: "https://learn.unity.com/course/oculus-vr-development",
        description: "Complete Unity VR development course"
      },
      {
        title: "VR Development with Unity - YouTube Series",
        url: "https://www.youtube.com/playlist?list=PLrk7hDwk64-Y6Geabn_xNrjuCnLKd2klJ",
        description: "Comprehensive VR development tutorial series"
      },
      {
        title: "Unity XR Development Documentation",
        url: "https://docs.unity3d.com/Manual/XR.html",
        description: "Official Unity XR and VR documentation"
      }
    ]
  },

  'Unity Game Development': {
    'collision|physics|rigidbody': [
      {
        title: "Unity Physics and Collision Tutorial",
        url: "https://www.youtube.com/watch?v=Bc9lmHjhagc",
        description: "Understanding Unity physics and collisions"
      },
      {
        title: "Rigidbody Mechanics - Unity Learn",
        url: "https://learn.unity.com/tutorial/physics-and-rigidbodies",
        description: "Official Unity physics tutorial"
      },
      {
        title: "Unity Collision Detection Guide",
        url: "https://docs.unity3d.com/ScriptReference/Collision.html",
        description: "Official collision detection documentation"
      }
    ],
    'script|component|gameobject': [
      {
        title: "Unity Scripting for Beginners",
        url: "https://www.youtube.com/watch?v=UuKX9OJDXDI",
        description: "Complete Unity C# scripting tutorial"
      },
      {
        title: "Unity Component System",
        url: "https://learn.unity.com/tutorial/components-and-scripts",
        description: "Understanding Unity's component architecture"
      },
      {
        title: "Unity Scripting API Reference",
        url: "https://docs.unity3d.com/ScriptReference/",
        description: "Complete Unity scripting documentation"
      }
    ],
    'default': [
      {
        title: "Unity Learn Platform",
        url: "https://learn.unity.com/",
        description: "Official Unity tutorials and courses"
      },
      {
        title: "Brackeys Unity Tutorials",
        url: "https://www.youtube.com/c/Brackeys",
        description: "Popular Unity game development tutorials"
      },
      {
        title: "Unity Documentation",
        url: "https://docs.unity3d.com/",
        description: "Official Unity scripting and component reference"
      }
    ]
  },

  'Unity Shader Programming': {
    'default': [
      {
        title: "Unity Shader Graph Tutorial",
        url: "https://www.youtube.com/watch?v=Ar9eIn4z6XE",
        description: "Complete Shader Graph tutorial for beginners"
      },
      {
        title: "Unity Shader Graph Documentation",
        url: "https://docs.unity3d.com/Packages/com.unity.shadergraph@latest/",
        description: "Official Shader Graph documentation"
      },
      {
        title: "HLSL Shader Programming",
        url: "https://www.youtube.com/watch?v=C4_RG8ZWCfM",
        description: "Understanding HLSL for Unity shaders"
      },
      {
        title: "Unity Shaders and Effects Cookbook",
        url: "https://catlikecoding.com/unity/tutorials/rendering/",
        description: "Advanced Unity rendering and shader tutorials"
      }
    ]
  },

  'Web Development': {
    'html|css': [
      {
        title: "HTML & CSS Full Course",
        url: "https://www.youtube.com/watch?v=G3e-cpL7ofc",
        description: "Complete HTML and CSS tutorial"
      },
      {
        title: "MDN Web Docs - HTML",
        url: "https://developer.mozilla.org/en-US/docs/Web/HTML",
        description: "Comprehensive HTML documentation"
      },
      {
        title: "CSS-Tricks",
        url: "https://css-tricks.com/",
        description: "CSS tutorials, guides, and reference"
      }
    ],
    'javascript|js': [
      {
        title: "JavaScript Full Course for Beginners",
        url: "https://www.youtube.com/watch?v=PkZNo7MFNFg",
        description: "Complete JavaScript tutorial"
      },
      {
        title: "MDN JavaScript Guide",
        url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
        description: "Official JavaScript documentation"
      },
      {
        title: "JavaScript.info",
        url: "https://javascript.info/",
        description: "Modern JavaScript tutorial"
      }
    ],
    'default': [
      {
        title: "FreeCodeCamp Web Development",
        url: "https://www.freecodecamp.org/",
        description: "Free full-stack web development course"
      },
      {
        title: "The Odin Project",
        url: "https://www.theodinproject.com/",
        description: "Free full-stack curriculum"
      },
      {
        title: "MDN Web Docs",
        url: "https://developer.mozilla.org/",
        description: "Comprehensive web development documentation"
      }
    ]
  },

  'Computer Science': {
    'default': [
      {
        title: "CS50 Introduction to Computer Science",
        url: "https://www.youtube.com/watch?v=YoXxevp1WRQ&list=PLhQjrBD2T382_R182iC2gNZI9HzWFMC_8",
        description: "Harvard's comprehensive intro CS course"
      },
      {
        title: "Data Structures and Algorithms",
        url: "https://www.youtube.com/watch?v=RBSGKlAvoiM",
        description: "Complete DSA course for beginners"
      },
      {
        title: "LeetCode",
        url: "https://leetcode.com/",
        description: "Practice coding problems and algorithms"
      },
      {
        title: "GeeksforGeeks",
        url: "https://www.geeksforgeeks.org/",
        description: "Computer science tutorials and practice"
      }
    ]
  },

  'Mathematics': {
    'default': [
      {
        title: "Khan Academy Math",
        url: "https://www.khanacademy.org/math",
        description: "Free math lessons from basic to advanced"
      },
      {
        title: "Professor Leonard",
        url: "https://www.youtube.com/c/ProfessorLeonard",
        description: "Clear math explanations and examples"
      },
      {
        title: "Wolfram Alpha",
        url: "https://www.wolframalpha.com/",
        description: "Step-by-step solutions and calculations"
      },
      {
        title: "Paul's Online Math Notes",
        url: "https://tutorial.math.lamar.edu/",
        description: "Comprehensive calculus and algebra notes"
      }
    ]
  },

  'Physics': {
    'default': [
      {
        title: "Khan Academy Physics",
        url: "https://www.khanacademy.org/science/physics",
        description: "Interactive physics lessons and practice"
      },
      {
        title: "Physics Classroom",
        url: "https://www.physicsclassroom.com/",
        description: "Comprehensive physics tutorials and concepts"
      },
      {
        title: "MinutePhysics",
        url: "https://www.youtube.com/user/minutephysics",
        description: "Quick, visual physics explanations"
      },
      {
        title: "HyperPhysics",
        url: "http://hyperphysics.phy-astr.gsu.edu/hbase/hframe.html",
        description: "Interactive physics concept map"
      }
    ]
  }
};
