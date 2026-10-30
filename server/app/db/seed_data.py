"""
Technician roster used by scripts/seed_technicians.py and by the tests.

Every (category, subcategory) pair is exactly a label the ML classifier can produce
(`ml model artifacts/model/config.json`), so any classified ticket has at least one matching technician.
"""

TECHNICIANS = [
    {
        "full_name": "Marcus Chen",
        "email": "marcus.chen@helpdesk.corp",
        "department": "Network Operations",
        "buildings": ["Science Block", "Examination Complex", "Tech Hub A"],
        "skills": {
            "Network": ["IP Address", "Wireless", "VPN", "DNS", "DHCP"],
        },
    },
    {
        "full_name": "Priya Nair",
        "email": "priya.nair@helpdesk.corp",
        "department": "Network & Desktop Support",
        "buildings": ["Library West", "Examination Complex"],
        "skills": {
            "Network": ["Wireless", "DNS", "DHCP"],
            "Hardware": ["Monitor", "Mouse", "Keyboard"],
            "Software": ["Email"],
        },
    },
    {
        "full_name": "Sarah Jenkins",
        "email": "sarah.jenkins@helpdesk.corp",
        "department": "Software & Data Services",
        "buildings": ["Engineering Hall", "Library West"],
        "skills": {
            "Software": ["Operating System", "Email"],
            "Database": ["DB2", "Oracle", "MS SQL Server"],
        },
    },
    {
        "full_name": "Tariq Al-Mansoor",
        "email": "tariq.almansoor@helpdesk.corp",
        "department": "Hardware & Helpdesk",
        "buildings": ["Operations Tower", "Central Admin"],
        "skills": {
            "Hardware": ["CPU", "Disk", "Keyboard", "Memory", "Monitor", "Mouse"],
            "Inquiry/Help": ["Internal Application", "Antivirus"],
        },
    },
]
