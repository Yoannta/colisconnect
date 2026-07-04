/**
 * Name: TODO
 * Student Number: TODO
 *
 * Stores employee details.
 */
public class Employee extends Person
{
    protected String id;
    protected String jobTitle;
    protected Date start;
    protected float salary;

    /**
     * Default constructor.
     */
    public Employee()
    {
        super();
        id = "";
        jobTitle = "";
        start = new Date();
        salary = 0.0f;
    }

    /**
     * Constructor to set employee variables.
     *
     * @param name employee name
     * @param gender employee gender
     * @param dob employee date of birth
     * @param id employee id
     * @param start employee start date
     */
    public Employee(String name, char gender, Date dob, String id, Date start)
    {
        super(name, gender, dob);
        this.id = id;
        this.start = new Date(start);
        jobTitle = "";
        salary = 0.0f;
    }

    /**
     * Create a clone from another employee.
     *
     * @param other employee to clone
     */
    public Employee(Employee other)
    {
        super(other);
        if (other == null)
        {
            id = "";
            jobTitle = "";
            start = new Date();
            salary = 0.0f;
        }
        else
        {
            id = other.id;
            jobTitle = other.jobTitle;
            start = new Date(other.start);
            salary = other.salary;
        }
    }

    /**
     * Setter method to alter salary.
     *
     * @param aSalary new salary
     */
    public void setSalary(float aSalary)
    {
        salary = aSalary;
    }

    /**
     * Getter method to return salary.
     *
     * @return salary
     */
    public float getSalary()
    {
        return salary;
    }

    /**
     * Setter method to alter the job title String.
     *
     * @param aJobTitle new job title
     */
    public void setJobTitle(String aJobTitle)
    {
        jobTitle = aJobTitle;
    }

    /**
     * Getter method to return the job title string.
     *
     * @return job title
     */
    public String getJobTitle()
    {
        return jobTitle;
    }

    /**
     * Setter method to alter the employee id.
     *
     * @param anId new employee id
     */
    public void setId(String anId)
    {
        id = anId;
    }

    /**
     * Getter method to return the employee id.
     *
     * @return employee id
     */
    public String getId()
    {
        return id;
    }

    /**
     * Setter method to alter the start date.
     *
     * @param aStart new start date
     */
    public void setStart(Date aStart)
    {
        start = new Date(aStart);
    }

    /**
     * Getter method to return the start date.
     *
     * @return cloned start date
     */
    public Date getStart()
    {
        return new Date(start);
    }

    /**
     * Override the toString() method of the Object class.
     *
     * @return employee details
     */
    public String toString()
    {
        return super.toString()
            + "\nEmployee ID: " + id
            + "\nStart Date: " + start
            + "\nJob Title: " + jobTitle
            + "\nSalary: " + salary;
    }
}
