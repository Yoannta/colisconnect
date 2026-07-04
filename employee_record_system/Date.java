import java.io.*;

/**
 * Name: TODO
 * Student Number: TODO
 *
 * Stores a simple day, month and year date.
 */
public class Date
{
    private int day;
    private int month;
    private int year;

    /**
     * Default Date constructor.
     */
    public Date()
    {
        day = 1;
        month = 1;
        year = 1900;
    }

    /**
     * Constructor to set class variables day, month and year.
     *
     * @param d day value
     * @param m month value
     * @param y year value
     */
    public Date(int d, int m, int y)
    {
        day = d;
        month = m;
        year = y;
    }

    /**
     * Create a clone from Date other.
     *
     * @param other date to clone
     */
    public Date(Date other)
    {
        if (other == null)
        {
            day = 1;
            month = 1;
            year = 1900;
        }
        else
        {
            day = other.day;
            month = other.month;
            year = other.year;
        }
    }

    /**
     * Method to convert month integer variable to a month String.
     *
     * @return month name
     */
    public String monthAsString()
    {
        String[] months = {
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        };

        if (month < 1 || month > 12)
        {
            return "Invalid";
        }

        return months[month - 1];
    }

    /**
     * Returns true if day, month and year are all equal to the corresponding
     * fields in other.
     *
     * @param other date to compare
     * @return true when both dates have the same values
     */
    public boolean equals(Date other)
    {
        return other != null
            && day == other.day
            && month == other.month
            && year == other.year;
    }

    /**
     * Check if Date is earlier than Date other.
     *
     * @param other date to compare
     * @return true when this date is earlier
     */
    public boolean earlierThan(Date other)
    {
        if (other == null)
        {
            return false;
        }

        if (year != other.year)
        {
            return year < other.year;
        }
        if (month != other.month)
        {
            return month < other.month;
        }
        return day < other.day;
    }

    /**
     * Reads a date from text in the format day/month/year.
     *
     * @param text date text
     * @return parsed Date object
     * @throws IllegalArgumentException when the text is not a valid date
     */
    public static Date parse(String text)
    {
        if (text == null)
        {
            throw new IllegalArgumentException("Date is empty");
        }

        String[] parts = text.trim().split("/");
        if (parts.length != 3)
        {
            throw new IllegalArgumentException("Use date format day/month/year");
        }

        int d = Integer.parseInt(parts[0].trim());
        int m = Integer.parseInt(parts[1].trim());
        int y = Integer.parseInt(parts[2].trim());

        if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1)
        {
            throw new IllegalArgumentException("Date values are outside the allowed range");
        }

        return new Date(d, m, y);
    }

    /**
     * Override the toString() method of the Object class.
     *
     * @return date as day/month/year
     */
    public String toString()
    {
        return day + "/" + month + "/" + year;
    }
}
