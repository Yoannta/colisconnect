import java.io.*;

/**
 * Name: TODO
 * Student Number: TODO
 *
 * Stores general details for a person.
 */
public abstract class Person
{
    protected String name;
    protected char gender;
    protected Date dateOfBirth;
    protected String address;
    protected String natInscNo;
    protected String phoneNo;

    /**
     * Default constructor.
     */
    public Person()
    {
        name = "";
        gender = 'U';
        dateOfBirth = new Date();
        address = "";
        natInscNo = "";
        phoneNo = "";
    }

    /**
     * Create a clone from Person other.
     *
     * @param other person to clone
     */
    public Person(Person other)
    {
        if (other == null)
        {
            name = "";
            gender = 'U';
            dateOfBirth = new Date();
            address = "";
            natInscNo = "";
            phoneNo = "";
        }
        else
        {
            name = other.name;
            gender = other.gender;
            dateOfBirth = new Date(other.dateOfBirth);
            address = other.address;
            natInscNo = other.natInscNo;
            phoneNo = other.phoneNo;
        }
    }

    /**
     * Constructor to set class variables name, gender and dateOfBirth.
     *
     * @param aName person name
     * @param sex person gender
     * @param dob person date of birth
     */
    public Person(String aName, char sex, Date dob)
    {
        name = aName;
        gender = sex;
        dateOfBirth = new Date(dob);
        address = "";
        natInscNo = "";
        phoneNo = "";
    }

    /**
     * Setter method to alter the Person name string.
     *
     * @param aName new name
     */
    public void setName(String aName)
    {
        name = aName;
    }

    /**
     * Setter method to alter the Person address string.
     *
     * @param addr new address
     */
    public void setAddress(String addr)
    {
        address = addr;
    }

    /**
     * Setter method to alter the Person national insurance number.
     *
     * @param ins new national insurance number
     */
    public void setNatInsNo(String ins)
    {
        natInscNo = ins;
    }

    /**
     * Setter method to alter the Person phone number.
     *
     * @param phone new phone number
     */
    public void setPhone(String phone)
    {
        phoneNo = phone;
    }

    /**
     * Setter method to alter the gender.
     *
     * @param sex new gender
     */
    public void setGender(char sex)
    {
        gender = sex;
    }

    /**
     * Setter method to alter the date of birth.
     *
     * @param dob new date of birth
     */
    public void setDateOfBirth(Date dob)
    {
        dateOfBirth = new Date(dob);
    }

    /**
     * Getter method to return the Person name String.
     *
     * @return person name
     */
    public String getName()
    {
        return name;
    }

    /**
     * Getter method to return the Person address String.
     *
     * @return address
     */
    public String getAddress()
    {
        return address;
    }

    /**
     * Getter method to return the Person national insurance String.
     *
     * @return national insurance number
     */
    public String getNatInsNo()
    {
        return natInscNo;
    }

    /**
     * Getter method to return the Person phone number.
     *
     * @return phone number
     */
    public String getPhone()
    {
        return phoneNo;
    }

    /**
     * Getter method to return the gender.
     *
     * @return gender
     */
    public char getGender()
    {
        return gender;
    }

    /**
     * Getter method to return the date of birth.
     *
     * @return cloned date of birth
     */
    public Date getDateOfBirth()
    {
        return new Date(dateOfBirth);
    }

    /**
     * Return true if name, dateOfBirth and national insurance number are same.
     *
     * @param other person to compare
     * @return true when the identifying fields match
     */
    public boolean equals(Person other)
    {
        return other != null
            && same(name, other.name)
            && same(natInscNo, other.natInscNo)
            && dateOfBirth.equals(other.dateOfBirth);
    }

    /**
     * Override the toString() method of the Object class.
     *
     * @return person details
     */
    public String toString()
    {
        return "Name: " + name
            + "\nGender: " + gender
            + "\nDate of Birth: " + dateOfBirth
            + "\nAddress: " + address
            + "\nNational Insurance No: " + natInscNo
            + "\nPhone No: " + phoneNo;
    }

    private boolean same(String first, String second)
    {
        if (first == null)
        {
            return second == null;
        }
        return first.equals(second);
    }
}
