import { FriendType } from "@/components/friends/TypeOfFriend";

export const DUMMY_USERS = {
    'me': {
        userId: 'me',
        name: 'Stephany S. Bedjrah',
        friendCount: 245,
        bio: 'I am known to be a software developer who enjoys hiking and coding.',
        avatarUrl: 'https://i.pravatar.cc/150?img=8',
        friendType: 'friends' as FriendType,
        percentageCompletion: 65,
        kycVerified: true,
        joinDate: "15th October, 2024",
        trustScore: 78,
        tier: "starter",
        aboutData: {
            personalDetails: {
                bio: 'I am known to be a software developer who enjoys hiking and coding.',
                fullName: 'John Doe',
                dateOfBirth: "14 November 1990",
                residence: "Mechelen, Belgium (4 years)",
                homeCountry: "Ghana",
            },
            workExperience: [
                {
                    title: "Senior Software Developer",
                    company: "Tech Company",
                    period: "2020 - Present",
                    description: "Developing web applications using React, Node.js, and TypeScript."
                },
                {
                    title: "Software Developer",
                    company: "Startup Inc.",
                    period: "2018 - 2020",
                    description: "Full-stack development and team leadership."
                }
            ],
            education: [
                {
                    degree: "Master of Computer Science",
                    institution: "University of Technology",
                    period: "2014 - 2016"
                },
                {
                    degree: "Bachelor of Software Engineering",
                    institution: "State University",
                    period: "2010 - 2014"
                }
            ]
        }
    },
    '1': {
        userId: '1',
        name: 'Alice Johnson',
        friendCount: 342,
        bio: 'Digital artist and creative director. Love exploring new technologies and meeting creative minds.',
        avatarUrl: 'https://i.pravatar.cc/150?img=1',
        friendType: 'friends' as FriendType,
        percentageCompletion: 40,
        kycVerified: false,
        joinDate: "1st November, 2025",
        trustScore: 92,
        tier: "elite",
        aboutData: {
            personalDetails: {
                bio: 'Digital artist and creative director. Love exploring new technologies and meeting creative minds.',
                fullName: 'Alice Johnson',
                dateOfBirth: "14 November 1990",
                residence: "Mechelen, Belgium (4 years)",
                homeCountry: "Ghana",
            },
            workExperience: [
                {
                    title: "Senior Creative Director",
                    company: "Digital Arts Studio",
                    period: "2020 - Present",
                    description: "Leading creative projects and managing design teams for digital campaigns."
                },
                {
                    title: "Digital Artist",
                    company: "Freelance",
                    period: "2016 - 2020",
                    description: "Created digital artwork for various clients and exhibitions."
                }
            ],
            education: [
                {
                    degree: "Master of Fine Arts",
                    institution: "Royal Academy of Fine Arts",
                    period: "2012 - 2014"
                },
                {
                    degree: "Bachelor of Visual Arts",
                    institution: "Art Institute of Brussels",
                    period: "2008 - 2012"
                }
            ]
        }
    },
    '2': {
        userId: '2',
        name: 'Bob Martinez',
        friendCount: 128,
        bio: 'Software engineer passionate about open source. Building the future, one commit at a time.',
        avatarUrl: 'https://i.pravatar.cc/150?img=12',
        friendType: 'friends' as FriendType,
        percentageCompletion: 75,
        kycVerified: true,
        joinDate: "20th March, 2024",
        trustScore: 85,
        tier: "reliable",
        aboutData: {
            personalDetails: {
                bio: 'Software engineer passionate about open source. Building the future, one commit at a time.',
                fullName: 'Bob Martinez',
                dateOfBirth: "23 March 1988",
                residence: "Amsterdam, Netherlands (3 years)",
                homeCountry: "Spain",
            },
            workExperience: [
                {
                    title: "Senior Software Engineer",
                    company: "TechCorp",
                    period: "2019 - Present",
                    description: "Developing scalable backend systems and mentoring junior developers."
                },
                {
                    title: "Full Stack Developer",
                    company: "StartupXYZ",
                    period: "2016 - 2019",
                    description: "Built web applications using React, Node.js, and MongoDB."
                }
            ],
            education: [
                {
                    degree: "Master in Computer Science",
                    institution: "Technical University of Madrid",
                    period: "2010 - 2012"
                },
                {
                    degree: "Bachelor in Software Engineering",
                    institution: "University of Barcelona",
                    period: "2006 - 2010"
                }
            ]
        }
    },
    '3': {
        userId: '3',
        name: 'Catherine Lee',
        friendCount: 567,
        bio: 'Travel blogger and photographer. Capturing moments from around the world.',
        avatarUrl: 'https://i.pravatar.cc/150?img=5',
        friendType: 'request-received' as FriendType,
        percentageCompletion: 30,
        kycVerified: false,
        joinDate: "5th July, 2025",
        trustScore: 67,
        tier: "trusted",
        aboutData: {
            personalDetails: {
                bio: 'Travel blogger and photographer. Capturing moments from around the world.',
                fullName: 'Catherine Lee',
                dateOfBirth: "8 July 1992",
                residence: "Berlin, Germany (2 years)",
                homeCountry: "South Korea",
            },
            workExperience: [
                {
                    title: "Travel Blogger & Photographer",
                    company: "Wanderlust Diaries",
                    period: "2018 - Present",
                    description: "Creating travel content and photography for global audience."
                },
                {
                    title: "Photography Assistant",
                    company: "Studio Light",
                    period: "2016 - 2018",
                    description: "Assisted in commercial photography projects and editing."
                }
            ],
            education: [
                {
                    degree: "Diploma in Photography",
                    institution: "Berlin School of Photography",
                    period: "2014 - 2016"
                },
                {
                    degree: "Bachelor of Communications",
                    institution: "Seoul National University",
                    period: "2010 - 2014"
                }
            ]
        }
    },
    '4': {
        userId: '4',
        name: 'David Sensei Akyekyede3',
        friendCount: 89,
        bio: 'Fitness enthusiast and nutritionist. Helping people live healthier lives.',
        avatarUrl: 'https://i.pravatar.cc/150?img=13',
        friendType: 'request-sent' as FriendType,
        percentageCompletion: 85,
        kycVerified: true,
        joinDate: "12th January, 2024",
        trustScore: 95,
        tier: "elite",
        aboutData: {
            personalDetails: {
                bio: 'Fitness enthusiast and nutritionist. Helping people live healthier lives.',
                fullName: 'David Chen',
                dateOfBirth: "19 December 1985",
                residence: "London, UK (5 years)",
                homeCountry: "China",
            },
            workExperience: [
                {
                    title: "Head Nutritionist",
                    company: "FitLife Clinic",
                    period: "2020 - Present",
                    description: "Providing personalized nutrition plans and fitness guidance."
                },
                {
                    title: "Fitness Trainer",
                    company: "City Gym",
                    period: "2017 - 2020",
                    description: "Conducted personal training sessions and group fitness classes."
                }
            ],
            education: [
                {
                    degree: "Master in Nutrition Science",
                    institution: "University of London",
                    period: "2013 - 2015"
                },
                {
                    degree: "Bachelor in Sports Science",
                    institution: "Beijing Sports University",
                    period: "2009 - 2013"
                }
            ]
        }
    },
    '5': {
        userId: '5',
        name: 'Emma Wilson',
        friendCount: 421,
        bio: 'Product designer with a passion for UX. Creating delightful user experiences.',
        avatarUrl: 'https://i.pravatar.cc/150?img=9',
        friendType: 'suggested' as FriendType,
        percentageCompletion: 55,
        kycVerified: false,
        joinDate: "30th August, 2025",
        trustScore: 73,
        tier: "reliable",
        aboutData: {
            personalDetails: {
                bio: 'Product designer with a passion for UX. Creating delightful user experiences.',
                fullName: 'Emma Wilson',
                dateOfBirth: "3 May 1991",
                residence: "Stockholm, Sweden (4 years)",
                homeCountry: "Sweden",
            },
            workExperience: [
                {
                    title: "Senior Product Designer",
                    company: "DesignStudio AB",
                    period: "2021 - Present",
                    description: "Leading design for mobile and web applications."
                },
                {
                    title: "UX Designer",
                    company: "TechSolutions Inc",
                    period: "2018 - 2021",
                    description: "Designed user interfaces and conducted user research."
                }
            ],
            education: [
                {
                    degree: "Master in Interaction Design",
                    institution: "Royal Institute of Technology",
                    period: "2014 - 2016"
                },
                {
                    degree: "Bachelor in Graphic Design",
                    institution: "Stockholm University",
                    period: "2010 - 2014"
                }
            ]
        }
    },
    '6': {
        userId: '6',
        name: 'Michael Brown',
        friendCount: 312,
        bio: 'Data scientist and AI researcher. Exploring the frontiers of machine learning.',
        avatarUrl: 'https://i.pravatar.cc/150?img=14',
        friendType: 'friends' as FriendType,
        percentageCompletion: 80,
        kycVerified: true,
        joinDate: "8th February, 2024",
        trustScore: 88,
        tier: "elite",
        aboutData: {
            personalDetails: {
                bio: 'Data scientist and AI researcher. Exploring the frontiers of machine learning.',
                fullName: 'Michael Brown',
                dateOfBirth: "12 September 1987",
                residence: "San Francisco, USA (6 years)",
                homeCountry: "USA",
            },
            workExperience: [
                {
                    title: "Lead Data Scientist",
                    company: "AI Research Lab",
                    period: "2019 - Present",
                    description: "Leading machine learning projects and research initiatives."
                },
                {
                    title: "Data Analyst",
                    company: "Tech Innovations",
                    period: "2016 - 2019",
                    description: "Analyzed complex datasets and built predictive models."
                }
            ],
            education: [
                {
                    degree: "PhD in Computer Science",
                    institution: "Stanford University",
                    period: "2011 - 2016"
                },
                {
                    degree: "Bachelor in Mathematics",
                    institution: "MIT",
                    period: "2007 - 2011"
                }
            ]
        }
    },
    '7': {
        userId: '7',
        name: 'Sophia Garcia',
        friendCount: 198,
        bio: 'Marketing specialist and content creator. Building brands through storytelling.',
        avatarUrl: 'https://i.pravatar.cc/150?img=25',
        friendType: 'suggested' as FriendType,
        percentageCompletion: 45,
        kycVerified: false,
        joinDate: "22nd May, 2025",
        trustScore: 62,
        tier: "trusted",
        aboutData: {
            personalDetails: {
                bio: 'Marketing specialist and content creator. Building brands through storytelling.',
                fullName: 'Sophia Garcia',
                dateOfBirth: "30 April 1993",
                residence: "Madrid, Spain (2 years)",
                homeCountry: "Mexico",
            },
            workExperience: [
                {
                    title: "Marketing Manager",
                    company: "Creative Agency",
                    period: "2020 - Present",
                    description: "Developing marketing strategies and managing brand campaigns."
                },
                {
                    title: "Content Creator",
                    company: "Freelance",
                    period: "2018 - 2020",
                    description: "Created engaging content for various digital platforms."
                }
            ],
            education: [
                {
                    degree: "Master in Marketing",
                    institution: "IE Business School",
                    period: "2016 - 2018"
                },
                {
                    degree: "Bachelor in Communications",
                    institution: "University of Mexico",
                    period: "2012 - 2016"
                }
            ]
        }
    },
    '8': {
        userId: '8',
        name: 'James Wilson',
        friendCount: 523,
        bio: 'Architect and urban planner. Designing sustainable cities for the future.',
        avatarUrl: 'https://i.pravatar.cc/150?img=32',
        friendType: 'request-received' as FriendType,
        percentageCompletion: 70,
        kycVerified: true,
        joinDate: "3rd December, 2024",
        trustScore: 81,
        tier: "reliable",
        aboutData: {
            personalDetails: {
                bio: 'Architect and urban planner. Designing sustainable cities for the future.',
                fullName: 'James Wilson',
                dateOfBirth: "17 August 1984",
                residence: "Copenhagen, Denmark (3 years)",
                homeCountry: "UK",
            },
            workExperience: [
                {
                    title: "Senior Architect",
                    company: "Sustainable Designs Ltd",
                    period: "2018 - Present",
                    description: "Leading architectural projects with focus on sustainability."
                },
                {
                    title: "Urban Planner",
                    company: "City Development Agency",
                    period: "2014 - 2018",
                    description: "Planned and developed urban infrastructure projects."
                }
            ],
            education: [
                {
                    degree: "Master in Architecture",
                    institution: "University College London",
                    period: "2009 - 2012"
                },
                {
                    degree: "Bachelor in Urban Planning",
                    institution: "University of Manchester",
                    period: "2005 - 2009"
                }
            ]
        }
    },
    '9': {
        userId: '9',
        name: 'Lisa Taylor',
        friendCount: 167,
        bio: 'Medical researcher and public health advocate. Working towards better healthcare solutions.',
        avatarUrl: 'https://i.pravatar.cc/150?img=28',
        friendType: 'suggested' as FriendType,
        percentageCompletion: 60,
        kycVerified: true,
        joinDate: "18th July, 2024",
        trustScore: 79,
        tier: "reliable",
        aboutData: {
            personalDetails: {
                bio: 'Medical researcher and public health advocate. Working towards better healthcare solutions.',
                fullName: 'Lisa Taylor',
                dateOfBirth: "22 January 1989",
                residence: "Toronto, Canada (4 years)",
                homeCountry: "Canada",
            },
            workExperience: [
                {
                    title: "Research Scientist",
                    company: "Medical Research Institute",
                    period: "2019 - Present",
                    description: "Conducting clinical trials and medical research studies."
                },
                {
                    title: "Public Health Officer",
                    company: "Health Department",
                    period: "2016 - 2019",
                    description: "Developed public health policies and awareness campaigns."
                }
            ],
            education: [
                {
                    degree: "PhD in Medical Sciences",
                    institution: "University of Toronto",
                    period: "2011 - 2016"
                },
                {
                    degree: "Bachelor in Biology",
                    institution: "McGill University",
                    period: "2007 - 2011"
                }
            ]
        }
    },
    '10': {
        userId: '10',
        name: 'Robert Kim',
        friendCount: 234,
        bio: 'Entrepreneur and startup founder. Building the next generation of tech companies.',
        avatarUrl: 'https://i.pravatar.cc/150?img=17',
        friendType: 'friends' as FriendType,
        percentageCompletion: 35,
        kycVerified: false,
        joinDate: "9th April, 2025",
        trustScore: 58,
        tier: "starter",
        aboutData: {
            personalDetails: {
                bio: 'Entrepreneur and startup founder. Building the next generation of tech companies.',
                fullName: 'Robert Kim',
                dateOfBirth: "5 March 1990",
                residence: "Seoul, South Korea (1 year)",
                homeCountry: "South Korea",
            },
            workExperience: [
                {
                    title: "Founder & CEO",
                    company: "TechStart Inc",
                    period: "2021 - Present",
                    description: "Leading a technology startup focused on AI solutions."
                },
                {
                    title: "Product Manager",
                    company: "Global Tech Corp",
                    period: "2018 - 2021",
                    description: "Managed product development and launch strategies."
                }
            ],
            education: [
                {
                    degree: "MBA",
                    institution: "Harvard Business School",
                    period: "2016 - 2018"
                },
                {
                    degree: "Bachelor in Computer Engineering",
                    institution: "KAIST",
                    period: "2012 - 2016"
                }
            ]
        }
    }
};

