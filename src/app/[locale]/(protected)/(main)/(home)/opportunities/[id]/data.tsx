import { CustomEducationComponent } from "@/components/cards/opportunities/CustomeEducationComponent";
import { CustomEmploymentComponent } from "@/components/cards/opportunities/CustomEmploymentComponent";


export const moreOpportunitiesIDList = [
    {
        id: "employment-career",
        title: "Employment & Career",
        customComponent: CustomEmploymentComponent,
        tabs: [
            {
                name: "All",
                filter: "all",
                emptystateMessage: "No employment career available."
            },
            {
                name: "Internships",
                filter: "internships",
                emptystateMessage: "No internships available."
            },
            {
                name: "Apprenticeships/Vocal Training",
                filter: "vocal-training",
                emptystateMessage: "No job openings available."
            },
            {
                name: "Graduate Trainee Programs",
                filter: "graduate-trainee-programs",
                emptystateMessage: "No job openings available."
            },
            {
                name: "Career Fairs",
                filter: "carreer-fairs",
                emptystateMessage: "No job openings available."
            },
          
        ],
    },


    {
    "id": "education-training",
    "title": "Education & Training",
    "customComponent": CustomEducationComponent,
    "tabs": [
        {
            "name": "All",
            "filter": "all",
            "emptystateMessage": "No education and training programs available."
        },
        {
            "name": "Online Courses",
            "filter": "online-courses",
            "emptystateMessage": "No online courses available."
        },
        {
            "name": "Certification Programs",
            "filter": "certification-programs",
            "emptystateMessage": "No certification programs available."
        },
        {
            "name": "Workshops & Seminars",
            "filter": "workshops-seminars",
            "emptystateMessage": "No workshops or seminars available."
        },
        {
            "name": "Skill Development",
            "filter": "skill-development",
            "emptystateMessage": "No skill development programs available."
        },
        {
            "name": "Professional Training",
            "filter": "professional-training",
            "emptystateMessage": "No professional training available."
        }
    ]
}
]